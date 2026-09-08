from fastapi.testclient import TestClient
from app.main import app
import time

client = TestClient(app)

def test_full_workflow():
    print("==================================================", flush=True)
    print("TESTING COMPLETE PROPERTY APPROVAL & NOTIFICATION WORKFLOW", flush=True)
    print("==================================================", flush=True)

    ts = int(time.time())

    # 1. Login as Admin
    print("\n1. Logging in as Super Admin (adminvoyara@gmail.com)...", flush=True)
    admin_login_res = client.post("/api/auth/login", json={
        "email": "adminvoyara@gmail.com",
        "password": "admin123"
    })
    assert admin_login_res.status_code == 200, f"Admin login failed: {admin_login_res.text}"
    admin_token = admin_login_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("[OK] Admin login successful.", flush=True)

    # 2. Register & Login as a new Host
    host_email = f"host_workflow_{ts}@voyara.com"
    print(f"\n2. Registering & logging in as Host ({host_email})...", flush=True)
    reg_res = client.post("/api/auth/register", json={
        "name": "Arjun Nair",
        "email": host_email,
        "password": "Password123!",
        "phone": f"+91 9{ts % 1000000000:09d}",
        "role": "PROVIDER",
        "business_name": "Nilgiri Eco Stays Pvt Ltd"
    })
    assert reg_res.status_code in [200, 201], f"Host registration failed: {reg_res.text}"

    host_login_res = client.post("/api/auth/login", json={
        "email": host_email,
        "password": "Password123!"
    })
    assert host_login_res.status_code == 200, f"Host login failed: {host_login_res.text}"
    host_token = host_login_res.json()["access_token"]
    host_headers = {"Authorization": f"Bearer {host_token}"}
    print("[OK] Host login successful.", flush=True)

    # 3. Check Initial Admin Unread Notifications
    admin_notifs_before = client.get("/api/notifications/unread-count", headers=admin_headers).json()
    print(f"Initial Admin Unread Notifications: {admin_notifs_before.get('unread_count', 0)}", flush=True)

    # 4. Host Submits New Property
    prop_name = f"Nilgiri Eco Sanctuary {ts}"
    print(f"\n3. Host submits new property: '{prop_name}'...", flush=True)
    new_prop_payload = {
        "name": prop_name,
        "property_type": "Resort",
        "description": "An exclusive tea plantation retreat nestled in the misty Nilgiri hills.",
        "address": "Tea Estate Road, Old Munnar",
        "city": "Munnar",
        "state": "Kerala",
        "country": "India",
        "location_details": "Near Tea Museum",
        "latitude": 10.0889,
        "longitude": 77.0595,
        "ownership_proof_url": "/uploads/ownership_proof_demo.pdf",
        "contact_phone": "+91 98470 12345",
        "contact_email": host_email,
        "check_in_time": "14:00",
        "check_out_time": "11:00",
        "amenities": ["Wi-Fi", "Tea Plantation Tour", "Mountain View", "Campfire"],
        "images": [
            "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80"
        ],
        "rooms": [
            {
                "name": "Heritage Tea Suite",
                "room_type": "Deluxe Room",
                "description": "Panoramic mountain view suite with fireplace.",
                "capacity": 2,
                "quantity": 3,
                "base_price": 5500.0,
                "amenities": ["King Bed", "Mountain View", "Electric Kettle", "Attached Bathroom"],
                "images": [
                    "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80"
                ]
            }
        ]
    }

    create_res = client.post("/api/provider/properties", json=new_prop_payload, headers=host_headers)
    assert create_res.status_code in [200, 201], f"Property creation failed: {create_res.text}"
    created_prop = create_res.json()
    prop_id = created_prop["id"]
    print(f"[OK] Property created successfully with ID #{prop_id}.", flush=True)
    print(f"  Verification Status: {created_prop.get('verification_status')}", flush=True)
    assert created_prop.get("verification_status") == "PENDING_VERIFICATION", "Status must be PENDING_VERIFICATION"

    # 5. Verify Property is NOT visible to Customers
    print("\n4. Verifying property is NOT visible to customers...", flush=True)
    public_search_res = client.get("/api/customer/search", params={"destination": "Munnar"})
    assert public_search_res.status_code == 200
    public_props = public_search_res.json()
    found_in_search = any(p["id"] == prop_id for p in public_props)
    assert not found_in_search, f"Error: Property #{prop_id} should NOT be in customer search results while PENDING_VERIFICATION!"

    public_detail_res = client.get(f"/api/customer/properties/{prop_id}")
    assert public_detail_res.status_code == 404, f"Direct customer view must return 404 for unverified property, got {public_detail_res.status_code}"
    print("[OK] Verified: Property is completely hidden from customers and returns 404 on direct view.", flush=True)

    # 6. Verify Admin Received In-App Notification
    print("\n5. Checking Admin Notifications...", flush=True)
    admin_notifs = client.get("/api/notifications", headers=admin_headers).json()
    assert len(admin_notifs) > 0, "Admin must have at least 1 notification"
    latest_admin_notif = admin_notifs[0]
    print(f"  Latest Admin Notification: '{latest_admin_notif['title']}' - '{latest_admin_notif['message']}'", flush=True)
    assert "New property verification request from" in latest_admin_notif['message']
    print("[OK] Admin received in-app notification for host submission.", flush=True)

    # 7. Admin Opens Property Requests List & Filters
    print("\n6. Admin fetching Property Requests...", flush=True)
    admin_props_res = client.get("/api/admin/properties", headers=admin_headers, params={"verification_status": "PENDING_VERIFICATION"})
    assert admin_props_res.status_code == 200
    admin_pending_props = admin_props_res.json()
    target_in_pending = next((p for p in admin_pending_props if p["id"] == prop_id), None)
    assert target_in_pending is not None, f"Property #{prop_id} must appear in Admin's PENDING_VERIFICATION list"
    print(f"[OK] Property #{prop_id} found in Admin Property Requests.", flush=True)
    print(f"  Host: {target_in_pending['provider_name']} ({target_in_pending['provider_email']})", flush=True)
    print(f"  Location: {target_in_pending['city']}, {target_in_pending['state']} (GPS: {target_in_pending['latitude']}, {target_in_pending['longitude']})", flush=True)

    # 8. Admin Deep Review Dossier
    print("\n7. Admin inspecting Property Dossier...", flush=True)
    dossier_res = client.get(f"/api/admin/properties/{prop_id}", headers=admin_headers)
    assert dossier_res.status_code == 200
    dossier = dossier_res.json()
    assert dossier["rooms_count"] == 1
    assert len(dossier["images"]) == 1
    print(f"[OK] Dossier loaded with {len(dossier['rooms'])} room types, photos, and location coordinates.", flush=True)

    # 8b. Admin Requests Review First (to test NEEDS_REVIEW flow)
    print("\n8. Admin testing 'REQUEST_REVIEW' action...", flush=True)
    review_req_res = client.post(f"/api/admin/properties/{prop_id}/verify", headers=admin_headers, json={
        "action": "REQUEST_REVIEW",
        "reason": "Please attach government property tax receipt for address verification."
    })
    assert review_req_res.status_code == 200
    print("[OK] Action REQUEST_REVIEW succeeded.", flush=True)

    # Host checks dashboard and notifications
    host_notifs = client.get("/api/notifications", headers=host_headers).json()
    latest_host_notif = host_notifs[0]
    print(f"  Host Notification: '{latest_host_notif['title']}' - '{latest_host_notif['message']}'", flush=True)
    assert f"Your property {prop_name} needs review." in latest_host_notif['message']

    host_props = client.get("/api/provider/properties", headers=host_headers).json()
    host_target = next(p for p in host_props if p["id"] == prop_id)
    assert host_target["verification_status"] == "NEEDS_REVIEW"
    assert "government property tax receipt" in host_target["verification_reason"]
    print("[OK] Host dashboard accurately reflects NEEDS_REVIEW and displays Admin's reason.", flush=True)

    # 9. Admin Approves Property
    print("\n9. Admin APPROVES Property...", flush=True)
    approve_res = client.post(f"/api/admin/properties/{prop_id}/verify", headers=admin_headers, json={
        "action": "APPROVE",
        "reason": "All ownership documentation and room details verified."
    })
    assert approve_res.status_code == 200
    approved_data = approve_res.json()
    assert approved_data["verification_status"] == "VERIFIED"
    print("[OK] Admin APPROVE succeeded. Status is now VERIFIED.", flush=True)

    # 10. Check Host Notification for Approval
    print("\n10. Checking Host Approval Notification...", flush=True)
    host_notifs_after = client.get("/api/notifications", headers=host_headers).json()
    approval_notif = host_notifs_after[0]
    print(f"  Host Approval Notification: '{approval_notif['title']}' - '{approval_notif['message']}'", flush=True)
    assert f"Your property {prop_name} has been approved and is now visible to customers." in approval_notif['message']

    # 11. Customer Visibility Verification (Live and Searchable)
    print("\n11. Verifying Customer Visibility for Approved Property...", flush=True)
    public_search_after = client.get("/api/customer/search", params={"destination": "Munnar"}).json()
    found_approved = any(p["id"] == prop_id for p in public_search_after)
    assert found_approved, f"Property #{prop_id} MUST now appear in customer search results!"

    public_detail_after = client.get(f"/api/customer/properties/{prop_id}")
    assert public_detail_after.status_code == 200
    pub_prop = public_detail_after.json()
    print(f"[OK] Property '{pub_prop['name']}' is now live on customer portal! Price from: INR {pub_prop.get('min_price')}", flush=True)

    # 12. Notification Read Management
    print("\n12. Testing Notification Read Status...", flush=True)
    unread_before = client.get("/api/notifications/unread-count", headers=host_headers).json()["unread_count"]
    print(f"  Host unread notifications: {unread_before}", flush=True)
    assert unread_before > 0
    mark_res = client.put(f"/api/notifications/{approval_notif['id']}/read", headers=host_headers)
    assert mark_res.status_code == 200
    unread_after = client.get("/api/notifications/unread-count", headers=host_headers).json()["unread_count"]
    assert unread_after == unread_before - 1
    print(f"[OK] Mark as read works! Unread count updated to: {unread_after}", flush=True)

    mark_all_res = client.put("/api/notifications/mark-all-read", headers=host_headers)
    assert mark_all_res.status_code == 200
    unread_final = client.get("/api/notifications/unread-count", headers=host_headers).json()["unread_count"]
    assert unread_final == 0
    print("[OK] Mark all as read works! Unread count is now 0.", flush=True)

    # 13. Admin Rejects Property (to test REJECT flow & customer hiding)
    print("\n13. Admin testing 'REJECT' action...", flush=True)
    reject_res = client.post(f"/api/admin/properties/{prop_id}/verify", headers=admin_headers, json={
        "action": "REJECT",
        "reason": "Property violates zoning regulations in fragile eco-zone."
    })
    assert reject_res.status_code == 200
    rejected_data = reject_res.json()
    assert rejected_data["verification_status"] == "REJECTED"
    print("[OK] Admin REJECT succeeded. Status is now REJECTED.", flush=True)

    # Host checks notification for rejection
    host_notifs_after_reject = client.get("/api/notifications", headers=host_headers).json()
    reject_notif = host_notifs_after_reject[0]
    print(f"  Host Rejection Notification: '{reject_notif['title']}' - '{reject_notif['message']}'", flush=True)
    assert f"Your property {prop_name} was rejected. Reason: Property violates zoning regulations in fragile eco-zone." in reject_notif['message']

    # Verify rejected property is immediately removed from customer search
    public_search_after_reject = client.get("/api/customer/search", params={"destination": "Munnar"}).json()
    found_rejected = any(p["id"] == prop_id for p in public_search_after_reject)
    assert not found_rejected, f"Rejected Property #{prop_id} MUST NOT appear in customer search!"

    public_detail_after_reject = client.get(f"/api/customer/properties/{prop_id}")
    assert public_detail_after_reject.status_code == 404, "Rejected property must return 404 to customer"
    print("[OK] Rejected property is completely hidden from customer search and direct views.", flush=True)

    # Host dashboard check
    host_props_final = client.get("/api/provider/properties", headers=host_headers).json()
    host_target_final = next(p for p in host_props_final if p["id"] == prop_id)
    assert host_target_final["verification_status"] == "REJECTED"
    assert "fragile eco-zone" in host_target_final["verification_reason"]
    print("[OK] Host dashboard correctly reflects REJECTED status with Admin reason displayed.", flush=True)

    print("\n==================================================", flush=True)
    print("ALL PROPERTY APPROVAL, REJECTION & NOTIFICATION TESTS PASSED! 100% SUCCESS", flush=True)
    print("==================================================", flush=True)

if __name__ == "__main__":
    test_full_workflow()
