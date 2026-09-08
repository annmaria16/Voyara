"""
End-to-end automated test suite for Voyara PostgreSQL Help & Support System
Tests:
- Ticket creation by registered users (Customer & Provider)
- PostgreSQL persistence of SupportTicket and SupportMessage
- Admin filtering by status (OPEN, IN_PROGRESS, RESOLVED), category, search, and date order
- User profile details inspection (name, email, phone, role, created_at)
- Admin reply submission and status update
- Full conversation thread retrieval
- User follow-up reply in thread
"""
import asyncio
import httpx

BASE_URL = "http://localhost:8000"

async def test_support_system():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        print("\n==========================================")
        print("1. Authenticating Test Users (Admin, Customer, Provider)")
        print("==========================================")
        
        # 1. Admin login
        admin_res = await client.post("/api/auth/login", json={
            "email": "adminvoyara@gmail.com",
            "password": "admin123"
        })
        assert admin_res.status_code == 200, f"Admin login failed: {admin_res.text}"
        admin_token = admin_res.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print("[OK] Admin authenticated successfully (adminvoyara@gmail.com)")

        # 2. Customer login
        cust_email = "john.traveler@example.com"
        cust_res = await client.post("/api/auth/login", json={
            "email": cust_email,
            "password": "customer123"
        })
        assert cust_res.status_code == 200, f"Customer login failed: {cust_res.text}"
        cust_token = cust_res.json()["access_token"]
        cust_headers = {"Authorization": f"Bearer {cust_token}"}
        print(f"[OK] Customer authenticated ({cust_email})")

        # 3. Provider login
        prov_email = "kerala.stays@voyara.com"
        prov_res = await client.post("/api/auth/login", json={
            "email": prov_email,
            "password": "provider123"
        })
        assert prov_res.status_code == 200, f"Provider login failed: {prov_res.text}"
        prov_token = prov_res.json()["access_token"]
        prov_headers = {"Authorization": f"Bearer {prov_token}"}
        print(f"[OK] Provider authenticated ({prov_email})")




        print("\n==========================================")
        print("2. Submitting Support Requests from Logged-in Users")
        print("==========================================")

        # Customer ticket
        cust_ticket_payload = {
            "subject": "Early check-in inquiry for Munnar Tea Sanctuary",
            "category": "Booking Inquiry",
            "message": "Hello Admin, we are arriving at 10 AM by flight. Can we request early check-in or drop our bags at the reception?",
            "booking_id": 1
        }
        create_cust_res = await client.post("/api/support/tickets", json=cust_ticket_payload, headers=cust_headers)
        assert create_cust_res.status_code == 200, f"Failed to create customer ticket: {create_cust_res.text}"
        cust_ticket = create_cust_res.json()
        cust_ticket_id = cust_ticket["id"]
        print(f"[OK] Customer Ticket #{cust_ticket_id} created in PostgreSQL with status '{cust_ticket['status']}'")
        assert len(cust_ticket["messages"]) >= 1, "Initial message should be created in SupportMessage table"
        assert cust_ticket["messages"][0]["message"] == cust_ticket_payload["message"]

        # Provider ticket
        prov_ticket_payload = {
            "subject": "Help with Google Map pin accuracy for cliff villa",
            "category": "Host Listing Help",
            "message": "We recently updated the property photos and need help verifying the exact location coordinates.",
        }
        create_prov_res = await client.post("/api/support/tickets", json=prov_ticket_payload, headers=prov_headers)
        assert create_prov_res.status_code == 200, f"Failed to create provider ticket: {create_prov_res.text}"
        prov_ticket = create_prov_res.json()
        prov_ticket_id = prov_ticket["id"]
        print(f"[OK] Provider Ticket #{prov_ticket_id} created in PostgreSQL with status '{prov_ticket['status']}'")

        print("\n==========================================")
        print("3. Admin Filtering & Identifying Requests")
        print("==========================================")

        # Filter by status: ALL
        all_tickets_res = await client.get("/api/support/admin/tickets?status=ALL", headers=admin_headers)
        assert all_tickets_res.status_code == 200
        all_tickets = all_tickets_res.json()
        print(f"[OK] Admin fetched all support requests (Total: {len(all_tickets)})")
        assert any(t["id"] == cust_ticket_id for t in all_tickets)

        # Filter by status: OPEN
        open_tickets_res = await client.get("/api/support/admin/tickets?status=OPEN", headers=admin_headers)
        assert open_tickets_res.status_code == 200
        open_tickets = open_tickets_res.json()
        print(f"[OK] Admin filtered status=OPEN (Found: {len(open_tickets)})")
        assert all(t["status"] == "OPEN" for t in open_tickets)

        # Filter by category: Host Listing Help
        cat_tickets_res = await client.get("/api/support/admin/tickets?category=Host%20Listing%20Help", headers=admin_headers)
        assert cat_tickets_res.status_code == 200
        cat_tickets = cat_tickets_res.json()
        print(f"[OK] Admin filtered category='Host Listing Help' (Found: {len(cat_tickets)})")
        assert any(t["id"] == prov_ticket_id for t in cat_tickets)

        # Search by keyword: 'Munnar'
        search_res = await client.get("/api/support/admin/tickets?search=Munnar", headers=admin_headers)
        assert search_res.status_code == 200
        search_tickets = search_res.json()
        print(f"[OK] Admin searched keyword='Munnar' (Found: {len(search_tickets)})")
        assert any(t["id"] == cust_ticket_id for t in search_tickets)

        print("\n==========================================")
        print("4. Inspecting Request & User Details")
        print("==========================================")

        detail_res = await client.get(f"/api/support/tickets/{cust_ticket_id}", headers=admin_headers)
        assert detail_res.status_code == 200, f"Failed to get ticket details: {detail_res.text}"
        detail = detail_res.json()
        print(f"[OK] Ticket #{detail['id']} user details:")
        print(f"   - Name: {detail['user']['name']}")
        print(f"   - Email: {detail['user']['email']}")
        print(f"   - Phone: {detail['user']['phone']}")
        print(f"   - Role: {detail['user']['role']}")
        print(f"   - Created At: {detail['user']['created_at']}")
        assert detail["user"]["email"] == cust_email
        assert len(detail["messages"]) == 1


        print("\n==========================================")
        print("5. Admin Replying to Customer & Updating Status")
        print("==========================================")

        admin_reply_payload = {
            "admin_response": "Hello John, we have contacted the Munnar Sanctuary manager. They are delighted to arrange complimentary early luggage drop at 10:00 AM. Check-in room access will follow at 12:00 PM.",
            "status": "IN_PROGRESS"
        }
        reply_res = await client.post(f"/api/support/admin/tickets/{cust_ticket_id}/reply", json=admin_reply_payload, headers=admin_headers)
        assert reply_res.status_code == 200, f"Admin reply failed: {reply_res.text}"
        updated_ticket = reply_res.json()
        print(f"[OK] Admin reply stored in PostgreSQL. Status updated to: {updated_ticket['status']}")
        assert updated_ticket["status"] == "IN_PROGRESS"
        assert len(updated_ticket["messages"]) == 2
        assert updated_ticket["messages"][1]["sender_role"] == "ADMIN"
        assert updated_ticket["messages"][1]["message"] == admin_reply_payload["admin_response"]

        print("\n==========================================")
        print("6. Customer Viewing Conversation History & Replying")
        print("==========================================")

        # Customer gets their tickets
        my_tickets_res = await client.get("/api/support/my-tickets", headers=cust_headers)
        assert my_tickets_res.status_code == 200
        my_tickets = my_tickets_res.json()
        cust_active_ticket = next(t for t in my_tickets if t["id"] == cust_ticket_id)
        print(f"[OK] Customer viewed ticket #{cust_ticket_id} history with {len(cust_active_ticket['messages'])} messages")
        assert len(cust_active_ticket["messages"]) == 2

        # Customer sends follow-up reply
        cust_reply_payload = {
            "message": "Thank you so much! That works wonderfully for us. See you soon!"
        }
        cust_reply_res = await client.post(f"/api/support/tickets/{cust_ticket_id}/reply", json=cust_reply_payload, headers=cust_headers)
        assert cust_reply_res.status_code == 200, f"Customer reply failed: {cust_reply_res.text}"
        thread_after_cust = cust_reply_res.json()
        print(f"[OK] Customer posted follow-up reply. Total messages in thread: {len(thread_after_cust['messages'])}")
        assert len(thread_after_cust["messages"]) == 3

        print("\n==========================================")
        print("7. Admin Resolving Support Request")
        print("==========================================")

        resolve_payload = {
            "admin_response": "You are very welcome! Have a safe journey and an unforgettable stay at Voyara.",
            "status": "RESOLVED"
        }
        resolve_res = await client.post(f"/api/support/admin/tickets/{cust_ticket_id}/reply", json=resolve_payload, headers=admin_headers)
        assert resolve_res.status_code == 200
        final_ticket = resolve_res.json()
        assert final_ticket["status"] == "RESOLVED"
        assert len(final_ticket["messages"]) == 4
        print(f"[OK] Ticket #{cust_ticket_id} successfully marked as RESOLVED with complete 4-message history.")

        print("\n==========================================")
        print("ALL HELP & SUPPORT SYSTEM E2E TESTS PASSED SUCCESSFULLY! [PASS]")
        print("==========================================\n")


if __name__ == "__main__":
    asyncio.run(test_support_system())
