import io
import time
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_workflow_fixes():
    print("=" * 60, flush=True)
    print("RUNNING COMPREHENSIVE WORKFLOW FIXES TEST SUITE", flush=True)
    print("=" * 60, flush=True)

    ts = int(time.time())

    # 1. Admin login
    print("\n[1] Admin Login...", flush=True)
    admin_login_res = client.post("/api/auth/login", json={
        "email": "adminvoyara@gmail.com",
        "password": "admin123"
    })
    assert admin_login_res.status_code == 200, f"Admin login failed: {admin_login_res.text}"
    admin_token = admin_login_res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("  [OK] Admin login successful.", flush=True)

    # 2. Host registration & login
    host_email = f"host_fixes_{ts}@voyara.com"
    print(f"\n[2] Registering Host ({host_email})...", flush=True)
    reg_res = client.post("/api/auth/register", json={
        "name": "Kavitha Menon",
        "email": host_email,
        "password": "Password123!",
        "phone": f"+91 9{ts % 1000000000:09d}",
        "role": "PROVIDER",
        "business_name": "Wayanad Highland Retreats"
    })
    assert reg_res.status_code in [200, 201], f"Host registration failed: {reg_res.text}"
    
    # Complete host phone and email verification
    host_phone_raw = f"+919{ts % 1000000000:09d}"
    v_phone = client.post("/api/auth/phone/verify-otp", json={
        "phone": host_phone_raw,
        "otp": "123456"
    })
    assert v_phone.status_code == 200, f"Phone verification failed: {v_phone.text}"

    from app.database import SessionLocal
    from app.models.user import User
    db = SessionLocal()
    hu = db.query(User).filter(User.email == host_email).first()
    if hu:
        hu.email_verified = True
        hu.account_status = "ACTIVE"
        db.commit()
    db.close()

    host_login_res = client.post("/api/auth/login", json={
        "email": host_email,
        "password": "Password123!"
    })
    assert host_login_res.status_code == 200, f"Host login failed: {host_login_res.text}"
    host_token = host_login_res.json()["access_token"]
    host_headers = {"Authorization": f"Bearer {host_token}"}
    print("  [OK] Host verified & login successful.", flush=True)

    # 3. Customer registration & login
    cust_email = f"customer_fixes_{ts}@voyara.com"
    print(f"\n[3] Registering Customer ({cust_email})...", flush=True)
    reg_cust_res = client.post("/api/auth/register", json={
        "name": "Rohan Sharma",
        "email": cust_email,
        "password": "Password123!",
        "phone": f"+91 9{ts % 900000000 + 100000000:09d}",
        "role": "CUSTOMER"
    })
    assert reg_cust_res.status_code in [200, 201], f"Customer reg failed: {reg_cust_res.text}"
    cust_login_res = client.post("/api/auth/login", json={
        "email": cust_email,
        "password": "Password123!"
    })
    assert cust_login_res.status_code == 200, f"Customer login failed: {cust_login_res.text}"
    cust_token = cust_login_res.json()["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}
    print("  [OK] Customer login successful.", flush=True)

    # 4. ISSUE 1: Test Image Uploads (JPG, PNG, WebP)
    print("\n[4] Testing Image Uploads (JPG, PNG, WebP)...", flush=True)
    
    # 4a. Upload JPG image
    jpg_data = b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00`\x00`\x00\x00\xff\xdb\x00C\x00" + b"\x00" * 64 + b"\xff\xc0\x00\x0b\x08\x00\x01\x00\x01\x01\x01\x11\x00\xff\xc4\x00\x1f\x00\x00\x01\x05\x01\x01\x01\x01\x01\x01\x00\x00\x00\x00\x00\x00\x00\x00\x01\x02\x03\x04\x05\x06\x07\x08\t\n\x0b\xff\xda\x00\x08\x01\x01\x00\x00?\x00\xbf\x00\xff\xd9"
    up_jpg = client.post("/api/upload/image", files={"file": ("room_view.jpg", io.BytesIO(jpg_data), "image/jpeg")})
    assert up_jpg.status_code == 200, f"JPG upload failed: {up_jpg.text}"
    jpg_url = up_jpg.json()["url"]
    assert jpg_url.startswith("/uploads/")
    print(f"  [OK] JPG Image uploaded: {jpg_url}", flush=True)

    # 4b. Upload PNG image
    png_data = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15c4\x00\x00\x00\rIDATx\x9cc`\x00\x00\x00\x02\x00\x01H\xaf\xa4q\x00\x00\x00\x00IEND\xaeB`\x82"
    up_png = client.post("/api/upload/image", files={"file": ("room_balcony.png", io.BytesIO(png_data), "image/png")})
    assert up_png.status_code == 200, f"PNG upload failed: {up_png.text}"
    png_url = up_png.json()["url"]
    assert png_url.startswith("/uploads/")
    print(f"  [OK] PNG Image uploaded: {png_url}", flush=True)

    # 4c. Upload WebP image
    webp_data = b"RIFF\x1a\x00\x00\x00WEBPVP8 \x0e\x00\x00\x000\x01\x00\x9d\x01*\x01\x00\x01\x00\x00\x020\x00\x00\x00\x00"
    up_webp = client.post("/api/upload/image", files={"file": ("room_interior.webp", io.BytesIO(webp_data), "image/webp")})
    assert up_webp.status_code == 200, f"WebP upload failed: {up_webp.text}"
    webp_url = up_webp.json()["url"]
    assert webp_url.startswith("/uploads/")
    print(f"  [OK] WebP Image uploaded: {webp_url}", flush=True)

    # 4d. Upload PDF Ownership Proof Document
    pdf_data = b"%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000052 00000 n \n0000000108 00000 n \ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n178\n%%EOF"
    up_pdf = client.post("/api/upload/document", files={"file": ("ownership_deed.pdf", io.BytesIO(pdf_data), "application/pdf")})
    assert up_pdf.status_code == 200, f"PDF upload failed: {up_pdf.text}"
    pdf_url = up_pdf.json()["url"]
    assert pdf_url.startswith("/uploads/")
    print(f"  [OK] Ownership Proof Document uploaded: {pdf_url}", flush=True)

    # 5. Host Submits Property with uploaded images (JPG, PNG, WebP)
    prop_name = f"Wayanad Mist Villa {ts}"
    prop_address = "Chembara Peak Valley Road, Meppadi"
    property_payload = {
        "name": prop_name,
        "property_type": "Villa",
        "description": "Luxurious mountain villa overlooking tea plantations with full amenities.",
        "address": prop_address,
        "city": "Wayanad",
        "state": "Kerala",
        "country": "India",
        "latitude": 11.5388,
        "longitude": 76.1264,
        "ownership_proof_url": pdf_url,
        "contact_phone": "+91 94470 54321",
        "contact_email": host_email,
        "check_in_time": "14:00",
        "check_out_time": "11:00",
        "amenities": ["Wi-Fi", "Swimming Pool", "Mountain View", "Private Lawn"],
        "images": [jpg_url, png_url], # Host-selected cover is jpg_url
        "rooms": [
            {
                "name": "Valley View Royal Suite",
                "room_type": "Luxury Suite",
                "description": "Master bedroom with attached jacuzzi and private balcony view.",
                "capacity": 3,
                "quantity": 2,
                "base_price": 6800.0,
                "amenities": ["King Bed", "Bathtub", "Private Balcony", "Air Conditioning"],
                "images": [webp_url, png_url] # Room cover is webp_url
            }
        ]
    }

    print(f"\n[5] Host Submits Property for Verification: '{prop_name}'...", flush=True)
    create_res1 = client.post("/api/provider/properties", json=property_payload, headers=host_headers)
    assert create_res1.status_code in [200, 201], f"Property creation failed: {create_res1.text}"
    created_prop1 = create_res1.json()
    prop_id = created_prop1["id"]
    print(f"  [OK] Created Property #{prop_id} with status: {created_prop1['verification_status']}", flush=True)
    assert created_prop1["verification_status"] in ["PENDING_VERIFICATION", "NEEDS_REVIEW", "PENDING"]

    # Verify primary image ordering
    assert created_prop1["images"][0]["image_url"] == jpg_url
    assert created_prop1["images"][0]["is_primary"] is True
    assert created_prop1["rooms"][0]["images"][0]["image_url"] == webp_url
    assert created_prop1["rooms"][0]["images"][0]["is_primary"] is True
    print("  [OK] Primary cover images accurately preserved for Property and Room!", flush=True)

    # 6. ISSUE 3: DUPLICATE REQUESTS PROTECTION
    print("\n[6] Testing Duplicate Request Protection (Multiple submissions)...", flush=True)
    admin_notifs_1 = client.get("/api/notifications", headers=admin_headers).json()
    count_before = len([n for n in admin_notifs_1 if "New property verification request" in n["title"]])

    # Host clicks submit again with the exact same property
    create_res2 = client.post("/api/provider/properties", json=property_payload, headers=host_headers)
    assert create_res2.status_code in [200, 201]
    created_prop2 = create_res2.json()
    assert created_prop2["id"] == prop_id, "Must return the existing property ID, not create a duplicate row!"
    assert created_prop2["verification_status"] in ["PENDING_VERIFICATION", "NEEDS_REVIEW", "PENDING"]

    # Host clicks submit a third time
    create_res3 = client.post("/api/provider/properties", json=property_payload, headers=host_headers)
    assert create_res3.status_code in [200, 201]
    created_prop3 = create_res3.json()
    assert created_prop3["id"] == prop_id

    # Check that provider's property list has ONLY 1 property, not duplicates
    host_props = client.get("/api/provider/properties", headers=host_headers).json()
    matching_props = [p for p in host_props if p["name"] == prop_name]
    assert len(matching_props) == 1, f"Expected exactly 1 property, found {len(matching_props)} duplicate records!"
    print(f"  [OK] Database protection verified: Exactly 1 property #{prop_id} exists in provider list.", flush=True)

    # Check Admin notifications count did NOT increase
    admin_notifs_2 = client.get("/api/notifications", headers=admin_headers).json()
    count_after = len([n for n in admin_notifs_2 if "New property verification request" in n["title"]])
    assert count_after == count_before, "No duplicate Admin notifications should be created for duplicate submissions!"
    print("  [OK] Admin notification deduplication verified: Exactly 1 approval request generated.", flush=True)

    # 7. ISSUE 2: ADMIN ACCESS TO PROPERTY FILES & OWNERSHIP PROOF
    print("\n[7] Testing Admin Ownership Proof & Property Files Access...", flush=True)

    # 7a. Admin accesses via Bearer header
    admin_doc_res = client.get(f"/api/admin/properties/{prop_id}/ownership-proof", headers=admin_headers)
    assert admin_doc_res.status_code == 200, f"Admin Bearer document access failed: {admin_doc_res.status_code}"
    assert "application/pdf" in admin_doc_res.headers.get("content-type", "")
    assert 'inline;' in admin_doc_res.headers.get("content-disposition", "")
    print("  [OK] Admin can open PDF document with Bearer header (Content-Disposition: inline).", flush=True)

    # 7b. Admin accesses via ?token= query parameter (simulates clicking link in new tab)
    admin_tab_res = client.get(f"/api/admin/properties/{prop_id}/ownership-proof?token={admin_token}")
    assert admin_tab_res.status_code == 200, f"Admin token query param access failed: {admin_tab_res.status_code}"
    assert admin_tab_res.content == pdf_data
    print("  [OK] Admin can open document directly in new browser tab via ?token= query parameter!", flush=True)

    # 7c. Customer / Non-admin is REJECTED (403 Forbidden)
    cust_doc_res = client.get(f"/api/admin/properties/{prop_id}/ownership-proof", headers=cust_headers)
    assert cust_doc_res.status_code == 403, f"Customer must be forbidden, got: {cust_doc_res.status_code}"

    cust_tab_res = client.get(f"/api/admin/properties/{prop_id}/ownership-proof?token={cust_token}")
    assert cust_tab_res.status_code == 403, f"Customer with query token must be forbidden, got: {cust_tab_res.status_code}"

    unauth_res = client.get(f"/api/admin/properties/{prop_id}/ownership-proof")
    assert unauth_res.status_code in [401, 403], f"Unauthenticated request must be rejected, got: {unauth_res.status_code}"
    print("  [OK] Confidentiality verified: Customers and unauthenticated users get 403/401 when attempting to access ownership proof.", flush=True)

    # 7d. Admin inspects property detail dossier
    dossier_res = client.get(f"/api/admin/properties/{prop_id}", headers=admin_headers)
    assert dossier_res.status_code == 200
    dossier = dossier_res.json()
    assert len(dossier["images"]) == 2
    assert dossier["images"][0]["image_url"] == jpg_url
    assert len(dossier["rooms"]) == 1
    assert dossier["rooms"][0]["images"][0]["image_url"] == webp_url
    assert dossier["ownership_proof_url"] == pdf_url
    print(f"  [OK] Admin review dossier contains all photos and files for property #{prop_id}.", flush=True)

    # 8. Admin Approves Property
    print("\n[8] Admin Approves Property...", flush=True)
    appr_res = client.post(f"/api/admin/properties/{prop_id}/verify", headers=admin_headers, json={
        "action": "APPROVE",
        "reason": "Ownership proof verified and property inspected."
    })
    assert appr_res.status_code == 200
    print("  [OK] Property approved.", flush=True)

    # 9. Verify Customer View & Image Display
    print("\n[9] Verifying Customer Views & Host-Uploaded Images...", flush=True)
    pub_detail_res = client.get(f"/api/customer/properties/{prop_id}")
    assert pub_detail_res.status_code == 200
    pub_prop = pub_detail_res.json()

    # Verify ownership proof is NOT leaked to customer
    assert "ownership_proof_url" not in pub_prop or pub_prop.get("ownership_proof_url") is None
    # Verify primary cover image is the host's uploaded JPG image
    assert pub_prop["images"][0]["image_url"] == jpg_url
    # Verify room cover image is the host's uploaded WebP image
    assert pub_prop["rooms"][0]["images"][0]["image_url"] == webp_url
    print(f"  [OK] Customer sees property '{pub_prop['name']}' with Host's uploaded cover photo and room image!", flush=True)

    print("\n" + "=" * 60)
    print("ALL WORKFLOW FIXES VERIFIED SUCCESSFULLY! 100% PASS")
    print("=" * 60, flush=True)

if __name__ == "__main__":
    test_workflow_fixes()
