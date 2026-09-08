import hmac
import hashlib
import uuid
import time
from datetime import date, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings

client = TestClient(app)

def test_razorpay_payment_suite():
    print("\n=======================================================")
    print("  VOYARA RAZORPAY PAYMENT GATEWAY TEST SUITE")
    print("=======================================================")

    # 1. Test Payment Config Endpoint
    r = client.get("/api/customer/payments/config")
    assert r.status_code == 200, f"Config endpoint failed: {r.text}"
    cfg = r.json()
    assert cfg["key_id"] == "rzp_test_4GCxMOoqwqydp6"
    assert cfg["currency"] == "INR"
    print(f"[PASS] 1. Razorpay public config verified: Key ID = {cfg['key_id']}")

    # 2. Authenticate Customer
    r = client.post("/api/auth/login", json={"email": "john.traveler@example.com", "password": "customer123"})
    assert r.status_code == 200, f"Customer login failed: {r.text}"
    cust_token = r.json()["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}
    print("[PASS] 2. Customer authenticated successfully.")

    # 3. Get property and room for booking
    r = client.get("/api/customer/search?destination=Munnar")
    assert r.status_code == 200
    props = r.json()
    assert len(props) > 0, "No properties found in search."
    property_id = props[0]["id"]

    r = client.get(f"/api/customer/properties/{property_id}")
    assert r.status_code == 200
    prop_detail = r.json()
    assert len(prop_detail["rooms"]) > 0, "No rooms found for property."
    room_id = prop_detail["rooms"][0]["id"]
    exp_id = prop_detail["experiences"][0]["id"] if prop_detail["experiences"] else None
    print(f"[PASS] 3. Target stay selected: '{prop_detail['name']}' (Room ID: {room_id}).")

    # 4. Create Razorpay Payment Order
    import random
    day_offset = random.randint(100, 500)
    check_in = (date.today() + timedelta(days=day_offset)).isoformat()
    check_out = (date.today() + timedelta(days=day_offset + 2)).isoformat()
    order_payload = {
        "property_id": property_id,
        "room_id": room_id,
        "check_in": check_in,
        "check_out": check_out,
        "total_guests": 2,
        "room_quantity": 1,
        "experience_id": exp_id,
        "experience_participants": 2 if exp_id else 0,
        "customer_notes": "Razorpay End-to-End Automated Test"
    }

    r = client.post("/api/customer/payments/create-order", json=order_payload, headers=cust_headers)
    assert r.status_code == 200, f"Order creation failed: {r.text}"
    order_data = r.json()
    assert order_data["order_id"].startswith("order_"), f"Invalid order ID: {order_data['order_id']}"
    assert order_data["amount"] > 0
    assert order_data["amount_paise"] == int(order_data["amount"] * 100)
    assert order_data["key_id"] == "rzp_test_4GCxMOoqwqydp6"
    booking_id = order_data["booking_id"]
    order_id = order_data["order_id"]
    print(f"[PASS] 4. Razorpay Order generated: {order_id} (Booking #{order_data['booking_number']}, Amount: Rs.{order_data['amount']}).")

    # 5. Test Signature Verification Security (Simulate Invalid Signature -> Must be Rejected)
    fake_payment_id = "pay_fake12345678"
    fake_signature = "invalid_signature_hash_99999"
    r_bad_sig = client.post(
        "/api/customer/payments/verify",
        json={
            "booking_id": booking_id,
            "razorpay_order_id": order_id,
            "razorpay_payment_id": fake_payment_id,
            "razorpay_signature": fake_signature
        },
        headers=cust_headers
    )
    assert r_bad_sig.status_code == 400, "Invalid signature should have been rejected with 400."
    print("[PASS] 5. Cryptographic signature security verified (Tampered signatures rejected).")

    # 6. Test Valid HMAC-SHA256 Signature Verification
    valid_payment_id = f"pay_test_{uuid.uuid4().hex[:12]}"
    msg = f"{order_id}|{valid_payment_id}".encode("utf-8")
    valid_signature = hmac.new(
        settings.RAZORPAY_KEY_SECRET.encode("utf-8"),
        msg,
        hashlib.sha256
    ).hexdigest()

    r_verify = client.post(
        "/api/customer/payments/verify",
        json={
            "booking_id": booking_id,
            "razorpay_order_id": order_id,
            "razorpay_payment_id": valid_payment_id,
            "razorpay_signature": valid_signature,
            "payment_method": "upi"
        },
        headers=cust_headers
    )
    assert r_verify.status_code == 200, f"Valid verification failed: {r_verify.text}"
    confirmed = r_verify.json()
    assert confirmed["status"] in ["CONFIRMED", "VERIFIED"], f"Unexpected status: {confirmed['status']}"
    print(f"[PASS] 6. Valid Razorpay HMAC signature accepted: Booking status changed to {confirmed['status']}.")

    # 7. Test Payment Receipt & Invoice Details Retrieval
    r_details = client.get(f"/api/customer/payments/{booking_id}", headers=cust_headers)
    assert r_details.status_code == 200, f"Payment details retrieval failed: {r_details.text}"
    pmt_info = r_details.json()
    assert pmt_info["payment"]["status"] == "PAID"
    assert pmt_info["payment"]["razorpay_payment_id"] == valid_payment_id
    assert pmt_info["payment"]["razorpay_order_id"] == order_id
    print(f"[PASS] 7. Tax Invoice & Payment Receipt data retrieved successfully (Receipt: {pmt_info['payment']['receipt']}).")

    # 8. Test Payment Failure / Cancellation Recording
    # Create another draft order to test cancellation
    day_offset_2 = random.randint(600, 900)
    check_in_2 = (date.today() + timedelta(days=day_offset_2)).isoformat()
    check_out_2 = (date.today() + timedelta(days=day_offset_2 + 2)).isoformat()
    order_payload_2 = {
        "property_id": property_id,
        "room_id": room_id,
        "check_in": check_in_2,
        "check_out": check_out_2,
        "total_guests": 1,
        "room_quantity": 1
    }
    r_order_2 = client.post("/api/customer/payments/create-order", json=order_payload_2, headers=cust_headers)
    assert r_order_2.status_code == 200
    order_2 = r_order_2.json()

    r_fail = client.post(
        "/api/customer/payments/failure",
        json={
            "booking_id": order_2["booking_id"],
            "razorpay_order_id": order_2["order_id"],
            "error_code": "PAYMENT_CANCELLED_BY_USER",
            "error_description": "User dismissed payment modal."
        },
        headers=cust_headers
    )
    assert r_fail.status_code == 200
    assert r_fail.json()["success"] == True
    print(f"[PASS] 8. Payment dismissal/failure state recorded cleanly.")

    print("\n=======================================================")
    print("  ALL RAZORPAY PAYMENT TESTS PASSED SUCCESSFULLY!  ")
    print("=======================================================\n")

if __name__ == "__main__":
    test_razorpay_payment_suite()
