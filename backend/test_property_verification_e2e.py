import asyncio
import os
import sys
import httpx
from datetime import datetime

# Ensure utf-8 stdout on windows
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")

BASE_URL = "http://localhost:8000"

async def test_full_property_verification_suite():
    print("=" * 60)
    print("STARTING FULL VOYARA PROPERTY VERIFICATION E2E TEST SUITE")
    print("=" * 60)

    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        # 0. Login as Provider, Admin, and Customer
        print("\n[Step 0] Logging in users (Provider, Admin, Customer)...")
        
        # Provider
        prov_res = await client.post("/api/auth/login", json={"email": "kerala.stays@voyara.com", "password": "provider123"})
        assert prov_res.status_code == 200, f"Provider login failed: {prov_res.text}"
        prov_token = prov_res.json()["access_token"]
        prov_headers = {"Authorization": f"Bearer {prov_token}"}
        print("  ✓ Provider logged in successfully")

        # Admin
        admin_res = await client.post("/api/auth/login", json={"email": "adminvoyara@gmail.com", "password": "admin123"})
        assert admin_res.status_code == 200, f"Admin login failed: {admin_res.text}"
        admin_token = admin_res.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print("  ✓ Admin logged in successfully")

        # Customer
        cust_res = await client.post("/api/auth/login", json={"email": "john.traveler@example.com", "password": "customer123"})
        assert cust_res.status_code == 200, f"Customer login failed: {cust_res.text}"
        cust_token = cust_res.json()["access_token"]
        cust_headers = {"Authorization": f"Bearer {cust_token}"}
        print("  ✓ Customer logged in successfully")

        # Upload a dummy ownership proof document via /api/upload/document
        print("\n[Step 0.1] Uploading dummy Ownership Proof document...")
        dummy_file_content = b"%PDF-1.4 Mock Ownership Certificate for Voyara Property"
        upload_res = await client.post(
            "/api/upload/document",
            files={"file": ("ownership_certificate.pdf", dummy_file_content, "application/pdf")},
            headers=prov_headers
        )
        assert upload_res.status_code == 200, f"Upload document failed: {upload_res.text}"
        ownership_doc_url = upload_res.json()["url"]
        print(f"  ✓ Uploaded document URL: {ownership_doc_url}")

        # ------------------------------------------------------------------
        # TEST 1: Provider creates "Seaside Haven Homestay" -> PENDING_VERIFICATION
        # ------------------------------------------------------------------
        print("\n" + "=" * 50)
        print("TEST 1: Provider creates 'Seaside Haven Homestay'")
        print("=" * 50)

        prop_payload = {
            "name": "Seaside Haven Homestay",
            "property_type": "Homestay",
            "description": "Tranquil cliffside homestay overlooking the pristine Arabian sea with traditional architecture.",
            "address": "North Cliff Road, Near Heliport",
            "city": "Varkala",
            "state": "Kerala",
            "country": "India",
            "contact_phone": "+91 98470 54321",
            "contact_email": "varkala.haven@example.com",
            "check_in_time": "14:00",
            "check_out_time": "11:00",
            "amenities": ["Wi-Fi", "Breakfast", "Beach Access", "Campfire"],
            "images": [
                "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80",
                "https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1200&q=80"
            ],
            "latitude": 8.7379,
            "longitude": 76.7163,
            "ownership_proof_url": ownership_doc_url
        }

        create_res = await client.post("/api/provider/properties", json=prop_payload, headers=prov_headers)
        assert create_res.status_code == 200, f"Failed to create property: {create_res.text}"
        prop_data = create_res.json()
        prop_id = prop_data["id"]
        print(f"  ✓ Property created with ID: {prop_id}")
        print(f"  ✓ Verification status: {prop_data.get('verification_status')}")
        assert prop_data.get("verification_status") == "PENDING_VERIFICATION", "Status must be PENDING_VERIFICATION"
        assert prop_data.get("latitude") == 8.7379, "Latitude mismatch"
        assert prop_data.get("longitude") == 76.7163, "Longitude mismatch"

        # Check Provider dashboard properties
        prov_props_res = await client.get("/api/provider/properties", headers=prov_headers)
        assert prov_props_res.status_code == 200
        found_in_prov = next((p for p in prov_props_res.json() if p["id"] == prop_id), None)
        assert found_in_prov is not None, "Property must be visible in provider dashboard"
        assert found_in_prov["verification_status"] == "PENDING_VERIFICATION"
        print("  ✓ Provider sees 'Pending Verification' on their dashboard")

        # Check Customer Search -> CANNOT see property
        cust_search_res = await client.get("/api/customer/search?destination=Varkala", headers=cust_headers)
        assert cust_search_res.status_code == 200
        found_in_cust = next((p for p in cust_search_res.json() if p["id"] == prop_id), None)
        assert found_in_cust is None, "Pending property MUST NOT be visible to customer search!"
        print("  ✓ Verified: Customer CANNOT see unverified property in search results")

        # Check Admin can see property in verification list
        admin_props_res = await client.get("/api/admin/properties?status=PENDING_VERIFICATION", headers=admin_headers)
        assert admin_props_res.status_code == 200
        found_in_admin = next((p for p in admin_props_res.json() if p["id"] == prop_id), None)
        assert found_in_admin is not None, "Admin must see pending property in Admin Center"
        print("  ✓ Admin CAN see the pending property in Admin Verification Center")

        # ------------------------------------------------------------------
        # TEST 2: Admin reviews dossier and approves property
        # ------------------------------------------------------------------
        print("\n" + "=" * 50)
        print("TEST 2: Admin reviews dossier and clicks APPROVE")
        print("=" * 50)

        # Admin gets full dossier
        dossier_res = await client.get(f"/api/admin/properties/{prop_id}", headers=admin_headers)
        assert dossier_res.status_code == 200, f"Failed to get dossier: {dossier_res.text}"
        dossier = dossier_res.json()
        assert dossier["name"] == "Seaside Haven Homestay"
        assert len(dossier["images"]) == 2
        assert dossier["latitude"] == 8.7379
        assert dossier["longitude"] == 76.7163
        assert dossier["ownership_proof_url"] == ownership_doc_url
        print(f"  ✓ Admin dossier loaded: details, photos ({len(dossier['images'])}), map ({dossier['latitude']}, {dossier['longitude']}), ownership proof")

        # Test Admin secure ownership document retrieval endpoint
        doc_download_res = await client.get(f"/api/admin/properties/{prop_id}/ownership-proof", headers=admin_headers)
        assert doc_download_res.status_code == 200, "Admin must be able to download ownership proof"
        print("  ✓ Admin successfully accessed ownership proof via secure admin endpoint")

        # Ensure Customer CANNOT access admin ownership proof endpoint
        cust_doc_res = await client.get(f"/api/admin/properties/{prop_id}/ownership-proof", headers=cust_headers)
        assert cust_doc_res.status_code in (401, 403), "Customer MUST NOT have access to admin ownership proof"
        print("  ✓ Customer access to admin ownership proof properly rejected (403/401)")

        # Admin Approves
        approve_res = await client.post(
            f"/api/admin/properties/{prop_id}/verify",
            json={"action": "APPROVE"},
            headers=admin_headers
        )
        assert approve_res.status_code == 200, f"Failed to approve property: {approve_res.text}"
        approved_data = approve_res.json()
        assert approved_data["verification_status"] == "VERIFIED"
        assert approved_data["verified_by"] is not None
        assert approved_data["verified_at"] is not None
        print(f"  ✓ Property approved: status = {approved_data['verification_status']}, verified_by = {approved_data['verified_by']}")

        # ------------------------------------------------------------------
        # TEST 3: Customer opens search/dashboard and sees the approved property
        # ------------------------------------------------------------------
        print("\n" + "=" * 50)
        print("TEST 3: Customer search returns approved property")
        print("=" * 50)

        cust_search_approved = await client.get("/api/customer/search?destination=Varkala", headers=cust_headers)
        assert cust_search_approved.status_code == 200
        found_approved = next((p for p in cust_search_approved.json() if p["id"] == prop_id), None)
        assert found_approved is not None, "Approved property MUST appear in customer search!"
        print(f"  ✓ Approved property found in search: {found_approved['name']}")
        
        # Verify customer schema DOES NOT expose ownership_proof or admin notes
        assert "ownership_proof_url" not in found_approved, "ownership_proof_url leaked in customer search schema!"
        assert "verification_reason" not in found_approved, "verification_reason leaked in customer search schema!"
        assert "verified_by" not in found_approved, "verified_by leaked in customer search schema!"
        print("  ✓ Verified: Customer search payload is secure (no ownership proof, no internal admin notes)")

        # Customer accesses property detail
        detail_res = await client.get(f"/api/customer/properties/{prop_id}", headers=cust_headers)
        assert detail_res.status_code == 200
        detail_data = detail_res.json()
        assert detail_data["name"] == "Seaside Haven Homestay"
        assert len(detail_data["images"]) == 2
        assert detail_data["verification_status"] == "VERIFIED"
        assert "ownership_proof_url" not in detail_data, "ownership_proof_url leaked in property details!"
        print("  ✓ Customer property details page returned 200 with photos and verified status")

        # ------------------------------------------------------------------
        # TEST 4: Provider creates property -> Admin REJECTS with reason
        # ------------------------------------------------------------------
        print("\n" + "=" * 50)
        print("TEST 4: Rejection flow")
        print("=" * 50)

        prop_payload_reject = {
            "name": "Invalid Unlicensed Villa",
            "property_type": "Villa",
            "description": "Mock villa with invalid documentation.",
            "address": "Random Street 1",
            "city": "Goa",
            "state": "Goa",
            "country": "India",
            "contact_phone": "+91 99999 88888",
            "contact_email": "invalid@example.com",
            "check_in_time": "14:00",
            "check_out_time": "11:00",
            "amenities": ["Wi-Fi"],
            "images": ["https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80"],
            "latitude": 15.5439,
            "longitude": 73.7554,
            "ownership_proof_url": ownership_doc_url
        }

        prop_rej_res = await client.post("/api/provider/properties", json=prop_payload_reject, headers=prov_headers)
        assert prop_rej_res.status_code == 200
        rej_prop_id = prop_rej_res.json()["id"]

        # Admin rejects
        reject_action_res = await client.post(
            f"/api/admin/properties/{rej_prop_id}/verify",
            json={"action": "REJECT", "reason": "Electricity bill name does not match host government ID."},
            headers=admin_headers
        )
        assert reject_action_res.status_code == 200
        assert reject_action_res.json()["verification_status"] == "REJECTED"
        assert reject_action_res.json()["verification_reason"] == "Electricity bill name does not match host government ID."
        print("  ✓ Admin rejected property with reason")

        # Customer search cannot see it
        cust_search_rej = await client.get("/api/customer/search?destination=Goa", headers=cust_headers)
        assert not any(p["id"] == rej_prop_id for p in cust_search_rej.json()), "Rejected property MUST NOT be visible to customer!"
        print("  ✓ Verified: Rejected property NOT returned in customer search")

        # Provider sees 'Rejected' with reason
        prov_props_rej = await client.get("/api/provider/properties", headers=prov_headers)
        rej_in_prov = next((p for p in prov_props_rej.json() if p["id"] == rej_prop_id), None)
        assert rej_in_prov["verification_status"] == "REJECTED"
        assert rej_in_prov["verification_reason"] == "Electricity bill name does not match host government ID."
        print(f"  ✓ Provider sees status: {rej_in_prov['verification_status']} with reason: '{rej_in_prov['verification_reason']}'")

        # ------------------------------------------------------------------
        # TEST 5: Provider creates property -> Admin selects NEEDS_REVIEW
        # ------------------------------------------------------------------
        print("\n" + "=" * 50)
        print("TEST 5: Needs Review flow")
        print("=" * 50)

        prop_payload_review = {
            "name": "Cloud View Homestay",
            "property_type": "Homestay",
            "description": "Homestay in Munnar needing clearer tax certificate.",
            "address": "Pothamedu Viewpoint",
            "city": "Munnar",
            "state": "Kerala",
            "country": "India",
            "contact_phone": "+91 94470 11111",
            "contact_email": "cloudview@example.com",
            "check_in_time": "14:00",
            "check_out_time": "11:00",
            "amenities": ["Wi-Fi", "Mountain View"],
            "images": ["https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80"],
            "latitude": 10.0889,
            "longitude": 77.0595,
            "ownership_proof_url": ownership_doc_url
        }

        prop_rev_res = await client.post("/api/provider/properties", json=prop_payload_review, headers=prov_headers)
        assert prop_rev_res.status_code == 200
        rev_prop_id = prop_rev_res.json()["id"]

        # Admin requests review
        rev_action_res = await client.post(
            f"/api/admin/properties/{rev_prop_id}/verify",
            json={"action": "REQUEST_REVIEW", "reason": "Please upload a higher-resolution scan of the municipal permit."},
            headers=admin_headers
        )
        assert rev_action_res.status_code == 200
        assert rev_action_res.json()["verification_status"] == "NEEDS_REVIEW"
        assert rev_action_res.json()["verification_reason"] == "Please upload a higher-resolution scan of the municipal permit."
        print("  ✓ Admin set status to NEEDS_REVIEW with reason note")

        # Customer cannot see it
        cust_search_rev = await client.get("/api/customer/search?destination=Munnar", headers=cust_headers)
        assert not any(p["id"] == rev_prop_id for p in cust_search_rev.json()), "NEEDS_REVIEW property MUST NOT be visible to customer!"
        print("  ✓ Verified: NEEDS_REVIEW property NOT returned in customer search")

        # Provider sees 'Needs Review' with reason
        prov_props_rev = await client.get("/api/provider/properties", headers=prov_headers)
        rev_in_prov = next((p for p in prov_props_rev.json() if p["id"] == rev_prop_id), None)
        assert rev_in_prov["verification_status"] == "NEEDS_REVIEW"
        assert rev_in_prov["verification_reason"] == "Please upload a higher-resolution scan of the municipal permit."
        print(f"  ✓ Provider sees status: {rev_in_prov['verification_status']} with note: '{rev_in_prov['verification_reason']}'")

        # ------------------------------------------------------------------
        # TEST 6: Direct Customer access to unverified ID returns 404
        # ------------------------------------------------------------------
        print("\n" + "=" * 50)
        print("TEST 6: Customer direct ID access to unverified property returns 404")
        print("=" * 50)

        # Try to access rejected property
        unverified_detail_res = await client.get(f"/api/customer/properties/{rej_prop_id}", headers=cust_headers)
        assert unverified_detail_res.status_code == 404, f"Expected 404, got {unverified_detail_res.status_code}"
        print(f"  ✓ Accessing REJECTED property {rej_prop_id} returned HTTP {unverified_detail_res.status_code} (404 Not Found)")

        # Try to access needs_review property
        needs_rev_detail_res = await client.get(f"/api/customer/properties/{rev_prop_id}", headers=cust_headers)
        assert needs_rev_detail_res.status_code == 404, f"Expected 404, got {needs_rev_detail_res.status_code}"
        print(f"  ✓ Accessing NEEDS_REVIEW property {rev_prop_id} returned HTTP {needs_rev_detail_res.status_code} (404 Not Found)")

        print("\n" + "=" * 60)
        print("🎉 ALL 6 TESTS PASSED FLAWLESSLY WITH COMPLETE SECURITY INTEGRITY!")
        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(test_full_property_verification_suite())
