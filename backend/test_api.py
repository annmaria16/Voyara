from datetime import date, timedelta
from fastapi.testclient import TestClient
from app.main import app
from app.models.user import UserRole

client = TestClient(app)

def test_full_voyara_workflow():
    print("[*] Starting Voyara end-to-end API test suite...")

    # 1. Test Root Info
    r = client.get("/")
    assert r.status_code == 200
    data = r.json()
    assert data["name"] == "Voyara"
    assert data["slogan"] == "Find Your Place."
    assert data["brand_message"] == "Stay. Explore. Experience."
    print("[PASS] Root health & brand endpoint verified.")

    # 2. Test Customer Login
    r = client.post("/api/auth/login", json={"email": "john.traveler@example.com", "password": "customer123"})
    assert r.status_code == 200
    customer_token = r.json()["access_token"]
    cust_headers = {"Authorization": f"Bearer {customer_token}"}
    print("[PASS] Customer authentication verified.")

    # 3. Test Provider Login
    r = client.post("/api/auth/login", json={"email": "kerala.stays@voyara.com", "password": "provider123"})
    assert r.status_code == 200
    provider_token = r.json()["access_token"]
    prov_headers = {"Authorization": f"Bearer {provider_token}"}
    print("[PASS] Provider authentication verified.")

    # 4. Test Admin Login
    r = client.post("/api/auth/login", json={"email": "admin@voyara.com", "password": "admin123"})
    assert r.status_code == 200
    admin_token = r.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("[PASS] Administrator authentication verified.")

    # 5. Test Customer Search (Destination = Munnar, Type = Resort)
    r = client.get("/api/customer/search?destination=Munnar&property_type=Resort")
    assert r.status_code == 200
    props = r.json()
    assert len(props) > 0
    assert any(p["name"] == "Mountain Breeze Resort" for p in props)
    print(f"[PASS] Customer search verified. Found {len(props)} matching property records.")

    # 6. Test Property Details
    p_id = props[0]["id"]
    r = client.get(f"/api/customer/properties/{p_id}")
    assert r.status_code == 200
    prop_detail = r.json()
    assert len(prop_detail["rooms"]) > 0
    assert len(prop_detail["experiences"]) > 0
    room_id = prop_detail["rooms"][0]["id"]
    exp_id = prop_detail["experiences"][0]["id"]
    print(f"[PASS] Property details verified for '{prop_detail['name']}' ({len(prop_detail['rooms'])} rooms, {len(prop_detail['experiences'])} experiences).")

    # 7. Test Customer Booking Flow with Experience Add-on
    check_in = (date.today() + timedelta(days=20)).isoformat()
    check_out = (date.today() + timedelta(days=22)).isoformat()
    booking_payload = {
        "property_id": p_id,
        "room_id": room_id,
        "check_in": check_in,
        "check_out": check_out,
        "total_guests": 2,
        "experience_id": exp_id,
        "experience_participants": 2,
        "customer_notes": "Automated verification test reservation."
    }
    r = client.post("/api/customer/bookings", json=booking_payload, headers=cust_headers)
    assert r.status_code == 200
    new_booking = r.json()
    assert new_booking["booking_number"].startswith("VOY-")
    assert new_booking["total_amount"] > 0
    booking_id = new_booking["id"]
    print(f"[PASS] Booking created successfully: #{new_booking['booking_number']} (Total: Rs.{new_booking['total_amount']}).")

    # 8. Test VeriNova Verification Results
    r = client.get(f"/api/verinova/results/{booking_id}")
    assert r.status_code == 200
    ver_detail = r.json()
    assert ver_detail["verification_status"] == "VERIFIED"
    assert len(ver_detail["checks"]) >= 5
    print(f"[PASS] VeriNova Transaction Verification VERIFIED with {len(ver_detail['checks'])} audit checks.")

    # 9. Test Double Booking Conflict Prevention
    r_conflict = client.post("/api/customer/bookings", json=booking_payload, headers=cust_headers)
    assert r_conflict.status_code == 400
    print("[PASS] Double booking conflict successfully prevented by backend availability engine.")

    # 10. Test Admin Verification Center & Dashboard
    r_admin_dash = client.get("/api/admin/dashboard", headers=admin_headers)
    assert r_admin_dash.status_code == 200
    dash_data = r_admin_dash.json()
    assert dash_data["stats"]["total_bookings"] >= 3
    assert dash_data["stats"]["verified_bookings"] >= 3
    print(f"[PASS] Admin Dashboard verified: {dash_data['stats']['total_properties']} properties, {dash_data['stats']['total_bookings']} bookings, {dash_data['stats']['verification_rate']}% verification rate.")

    r_admin_ver = client.get("/api/admin/verification", headers=admin_headers)
    assert r_admin_ver.status_code == 200
    assert len(r_admin_ver.json()) >= 3
    print(f"[PASS] Admin Verification Center listed {len(r_admin_ver.json())} transaction audit records.")

    print("\n[ALL TESTS PASSED] Voyara backend and VeriNova verification engine are 100% operational!\n")

if __name__ == "__main__":
    test_full_voyara_workflow()
