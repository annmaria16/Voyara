from datetime import date, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.models.provider import ProviderProfile
from app.models.property import Property, PropertyType, PropertyImage, PropertyAmenity
from app.models.room import Room, RoomImage, RoomAmenity
from app.models.experience import Experience, ExperienceSchedule
from app.models.booking import Booking, BookingStatus, BookingRoom, BookingExperience
from app.auth.password import hash_password
from app.services.verinova.verification_service import VeriNovaService

def seed_database():
    print("[*] Initializing database schema...")
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    # Check if admin already exists
    if db.query(User).filter((User.email == "adminvoyara@gmail.com") | (User.email == "admin@voyara.com")).first():
        print("[!] Database already contains seed data.")
        db.close()
        return

    print("[+] Seeding users and providers...")

    # 1. Admin
    admin = User(
        email="adminvoyara@gmail.com",
        name="Voyara Administrator",
        phone="+919876543210",
        hashed_password=hash_password("admin123"),
        role=UserRole.ADMIN,
        is_active=True,
        account_status="ACTIVE",
        phone_verified=True,
        email_verified=True
    )
    db.add(admin)

    # 2. Providers
    provider1_user = User(
        email="kerala.stays@voyara.com",
        name="Rohan Nair",
        phone="+919847012345",
        hashed_password=hash_password("provider123"),
        role=UserRole.PROVIDER,
        is_active=True,
        account_status="ACTIVE",
        phone_verified=True,
        email_verified=True
    )
    db.add(provider1_user)
    db.commit()

    provider1_profile = ProviderProfile(
        user_id=provider1_user.id,
        business_name="Highland Escapes & Resorts",
        description="Curators of authentic hill-station stays and mountain adventures across Kerala.",
        contact_phone="+919847012345",
        contact_email="kerala.stays@voyara.com",
        verification_status="VERIFIED"
    )
    db.add(provider1_profile)

    provider2_user = User(
        email="coastal.villas@voyara.com",
        name="Elena D'Souza",
        phone="+919822054321",
        hashed_password=hash_password("provider123"),
        role=UserRole.PROVIDER,
        is_active=True,
        account_status="ACTIVE",
        phone_verified=True,
        email_verified=True
    )
    db.add(provider2_user)
    db.commit()

    provider2_profile = ProviderProfile(
        user_id=provider2_user.id,
        business_name="Sunset Coast Stays & Marine Adventures",
        description="Premium seaside villas, luxury beachfront glamping, and coastal water activities.",
        contact_phone="+919822054321",
        contact_email="coastal.villas@voyara.com",
        verification_status="VERIFIED"
    )
    db.add(provider2_profile)

    # 3. Customers
    cust1 = User(
        email="john.traveler@example.com",
        name="John Doe",
        phone="+919123456780",
        hashed_password=hash_password("customer123"),
        role=UserRole.CUSTOMER,
        is_active=True,
        account_status="ACTIVE",
        phone_verified=True,
        email_verified=True
    )
    cust2 = User(
        email="sarah.explorer@example.com",
        name="Sarah Jenkins",
        phone="+919123456789",
        hashed_password=hash_password("customer123"),
        role=UserRole.CUSTOMER,
        is_active=True,
        account_status="ACTIVE",
        phone_verified=True,
        email_verified=True
    )
    db.add_all([cust1, cust2])
    db.commit()

    print("[+] Seeding curated properties, rooms, and experiences...")

    # ==========================================
    # PROPERTY 1: Mountain Breeze Resort (Munnar)
    # ==========================================
    p1 = Property(
        provider_id=provider1_profile.id,
        name="Mountain Breeze Resort",
        property_type=PropertyType.RESORT.value,
        description="Perched atop the mist-clad hills of Munnar, Mountain Breeze Resort offers panoramic tea garden vistas, luxury eco-cottages, and private hillside balconies. Wake up to fresh mountain air and chirping birds.",
        address="Pothamedu Viewpoint Road, Devikulam",
        city="Munnar",
        state="Kerala",
        country="India",
        location_details="15 mins from Munnar Town, adjacent to tea plantations",
        contact_phone="+91 9847012345",
        contact_email="reservations@mountainbreeze.in",
        check_in_time="14:00",
        check_out_time="11:00",
        rating=4.9,
        review_count=38,
        featured=True,
        is_active=True
    )
    db.add(p1)
    db.commit()

    for img_url in [
        "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"
    ]:
        db.add(PropertyImage(property_id=p1.id, image_url=img_url, is_primary=(img_url == "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80")))

    for am in ["Wi-Fi", "Swimming Pool", "Breakfast", "Mountain View", "Restaurant", "Campfire", "Parking", "Room Service"]:
        db.add(PropertyAmenity(property_id=p1.id, amenity_name=am))

    # P1 Rooms
    r1_1 = Room(
        property_id=p1.id,
        name="Deluxe Mountain View Suite",
        room_type="Deluxe Room",
        description="Spacious wooden-accented room with private balcony opening directly into mist-covered tea hills.",
        capacity=2,
        quantity=5,
        base_price=5000.0,
        is_active=True
    )
    r1_2 = Room(
        property_id=p1.id,
        name="Highland Family Villa",
        room_type="Family Room",
        description="Two-bedroom mountain chalet featuring a stone fireplace, private garden patio, and king beds.",
        capacity=4,
        quantity=2,
        base_price=8500.0,
        is_active=True
    )
    db.add_all([r1_1, r1_2])
    db.commit()

    db.add(RoomImage(room_id=r1_1.id, image_url="https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=80", is_primary=True))
    db.add(RoomImage(room_id=r1_2.id, image_url="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80", is_primary=True))
    for am in ["King Bed", "Balcony", "Free Wi-Fi", "Hot Shower", "Tea Maker"]:
        db.add(RoomAmenity(room_id=r1_1.id, amenity_name=am))
        db.add(RoomAmenity(room_id=r1_2.id, amenity_name=am))

    # P1 Experiences
    e1_1 = Experience(
        property_id=p1.id,
        title="Guided Trek to Meesapulimala Peak",
        experience_type="Guided Trek",
        description="Early morning guided trekking through rhododendron valleys and cloud-capped ridges with a certified naturalist.",
        price=1200.0,
        pricing_model="per_person",
        capacity=15,
        duration="4.5 Hours",
        schedule_type="recurring",
        start_time="06:30",
        end_time="11:00",
        image_url="https://images.unsplash.com/photo-1551632811-561732d1e306?auto=format&fit=crop&w=1000&q=80",
        is_active=True
    )
    e1_2 = Experience(
        property_id=p1.id,
        title="Starlit Campfire & Acoustic Mountain Night",
        experience_type="Campfire",
        description="Evening gathering by the outdoor stone fire pit with local plantation appetizers, hot cocoa, and acoustic guitar sessions.",
        price=500.0,
        pricing_model="per_person",
        capacity=25,
        duration="2.5 Hours",
        schedule_type="recurring",
        start_time="19:00",
        end_time="21:30",
        image_url="https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=1000&q=80",
        is_active=True
    )
    db.add_all([e1_1, e1_2])
    db.commit()

    # ==========================================
    # PROPERTY 2: Green Valley Homestay (Munnar)
    # ==========================================
    p2 = Property(
        provider_id=provider1_profile.id,
        name="Green Valley Homestay",
        property_type=PropertyType.HOMESTAY.value,
        description="Experience genuine warm Kerala hospitality in an organic cardamom plantation. Home-cooked traditional meals made with farm-fresh produce.",
        address="Chithirapuram Post",
        city="Munnar",
        state="Kerala",
        country="India",
        location_details="Surrounded by organic spice orchards",
        contact_phone="+91 9847012345",
        contact_email="stay@greenvalleyhomestay.in",
        check_in_time="13:00",
        check_out_time="11:00",
        rating=4.8,
        review_count=24,
        featured=True,
        is_active=True
    )
    db.add(p2)
    db.commit()

    for img_url in [
        "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=80"
    ]:
        db.add(PropertyImage(property_id=p2.id, image_url=img_url, is_primary=True))

    for am in ["Wi-Fi", "Breakfast", "Mountain View", "Parking", "Pet Friendly", "Outdoor Activities"]:
        db.add(PropertyAmenity(property_id=p2.id, amenity_name=am))

    r2_1 = Room(
        property_id=p2.id,
        name="Cardamom Plantation Room",
        room_type="Standard Room",
        description="Cozy room with handcrafted teak furniture and large glass windows looking out onto lush spice plants.",
        capacity=2,
        quantity=3,
        base_price=3200.0,
        is_active=True
    )
    db.add(r2_1)
    db.commit()
    db.add(RoomImage(room_id=r2_1.id, image_url="https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1000&q=80", is_primary=True))

    e2_1 = Experience(
        property_id=p2.id,
        title="Traditional Kerala Spice Trail & Farm Cooking",
        experience_type="Local Food Experience",
        description="Walk through 20+ varieties of wild spices with the host, harvest cardamom pods, and learn clay-pot Kerala cooking.",
        price=800.0,
        pricing_model="per_person",
        capacity=12,
        duration="3 Hours",
        schedule_type="recurring",
        start_time="10:00",
        end_time="13:00",
        image_url="https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1000&q=80",
        is_active=True
    )
    db.add(e2_1)
    db.commit()

    # ==========================================
    # PROPERTY 3: Azure Horizon Luxury Villa (Goa)
    # ==========================================
    p3 = Property(
        provider_id=provider2_profile.id,
        name="Azure Horizon Luxury Villa",
        property_type=PropertyType.VILLA.value,
        description="An ultra-luxury 4-bedroom cliffside sanctuary overlooking the Arabian Sea with a private infinity pool, sunset deck, and dedicated private chef.",
        address="Aguada Fort Road, Candolim",
        city="Goa",
        state="Goa",
        country="India",
        location_details="Private clifftop overlooking the ocean",
        contact_phone="+91 9822054321",
        contact_email="concierge@azurehorizon.com",
        check_in_time="15:00",
        check_out_time="12:00",
        rating=5.0,
        review_count=19,
        featured=True,
        is_active=True
    )
    db.add(p3)
    db.commit()

    for img_url in [
        "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80"
    ]:
        db.add(PropertyImage(property_id=p3.id, image_url=img_url, is_primary=True))

    for am in ["Swimming Pool", "Beach Access", "Wi-Fi", "Air Conditioning", "Breakfast", "Room Service", "Parking"]:
        db.add(PropertyAmenity(property_id=p3.id, amenity_name=am))

    r3_1 = Room(
        property_id=p3.id,
        name="Royal Sunset Infinity Suite",
        room_type="Premium Villa",
        description="Oceanfront master suite with direct floor-to-ceiling glass patio doors leading to the infinity pool.",
        capacity=2,
        quantity=2,
        base_price=12000.0,
        is_active=True
    )
    db.add(r3_1)
    db.commit()
    db.add(RoomImage(room_id=r3_1.id, image_url="https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80", is_primary=True))

    e3_1 = Experience(
        property_id=p3.id,
        title="Sunset Sea Kayaking & Dolphin Spotting",
        experience_type="Outdoor Activity",
        description="Guided paddle along the coastal sea caves and tranquil dolphin pods at golden hour.",
        price=1800.0,
        pricing_model="per_person",
        capacity=8,
        duration="2.5 Hours",
        schedule_type="recurring",
        start_time="16:30",
        end_time="19:00",
        image_url="https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=1000&q=80",
        is_active=True
    )
    db.add(e3_1)
    db.commit()

    # ==========================================
    # PROPERTY 4: Serenity Shores Beach Camp (Gokarna)
    # ==========================================
    p4 = Property(
        provider_id=provider2_profile.id,
        name="Serenity Shores Beach Camp",
        property_type=PropertyType.CAMP.value,
        description="Boho-chic beachfront glamping tents nestled directly under coconut palm canopies on Paradise Beach. Fall asleep to waves crashing on golden sands.",
        address="Paradise Beach Trail",
        city="Gokarna",
        state="Karnataka",
        country="India",
        location_details="Direct beachfront access",
        contact_phone="+91 9822054321",
        contact_email="camp@serenityshores.in",
        check_in_time="13:00",
        check_out_time="11:00",
        rating=4.7,
        review_count=31,
        featured=False,
        is_active=True
    )
    db.add(p4)
    db.commit()

    for img_url in [
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80",
        "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?auto=format&fit=crop&w=1200&q=80"
    ]:
        db.add(PropertyImage(property_id=p4.id, image_url=img_url, is_primary=True))

    for am in ["Beach Access", "Campfire", "Breakfast", "Outdoor Activities", "Pet Friendly"]:
        db.add(PropertyAmenity(property_id=p4.id, amenity_name=am))

    r4_1 = Room(
        property_id=p4.id,
        name="Bohemian Oceanfront Bell Tent",
        room_type="Tent",
        description="Custom canvas glamping dome furnished with queen mattress, string lights, and bamboo deck chairs.",
        capacity=2,
        quantity=6,
        base_price=2500.0,
        is_active=True
    )
    db.add(r4_1)
    db.commit()
    db.add(RoomImage(room_id=r4_1.id, image_url="https://images.unsplash.com/photo-1510312305653-8ed496efae75?auto=format&fit=crop&w=1000&q=80", is_primary=True))

    # ==========================================
    # PROPERTY 5: Pine Crest Himalayan Cottage (Manali)
    # ==========================================
    p5 = Property(
        provider_id=provider1_profile.id,
        name="Pine Crest Himalayan Cottage",
        property_type=PropertyType.COTTAGE.value,
        description="Authentic cedarwood cottage surrounded by apple orchards and snow-capped Himalayan peaks. Enjoy cozy wood-burning stoves and hot herbal teas.",
        address="Old Manali Village Road",
        city="Manali",
        state="Himachal Pradesh",
        country="India",
        location_details="Upper Old Manali amidst pine forests",
        contact_phone="+91 9847012345",
        contact_email="stay@pinecrestmanali.com",
        check_in_time="14:00",
        check_out_time="11:00",
        rating=4.9,
        review_count=16,
        featured=False,
        is_active=True
    )
    db.add(p5)
    db.commit()

    db.add(PropertyImage(property_id=p5.id, image_url="https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80", is_primary=True))
    for am in ["Mountain View", "Wi-Fi", "Breakfast", "Bonfire", "Room Service", "Parking"]:
        db.add(PropertyAmenity(property_id=p5.id, amenity_name=am))

    r5_1 = Room(
        property_id=p5.id,
        name="Cedarwood Attic Cottage",
        room_type="Cottage Unit",
        description="Double-height wooden attic cottage with skylight views of snow summits and private wood fire stove.",
        capacity=3,
        quantity=3,
        base_price=4200.0,
        is_active=True
    )
    db.add(r5_1)
    db.commit()
    db.add(RoomImage(room_id=r5_1.id, image_url="https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=80", is_primary=True))

    print("[+] Creating initial verified bookings and running VeriNova transaction audit...")

    # Sample Booking 1: John books Mountain Breeze Resort (Room + Guided Trek)
    check_in_1 = date.today() + timedelta(days=5)
    check_out_1 = date.today() + timedelta(days=7)
    nights_1 = 2
    room_total_1 = 5000.0 * nights_1
    exp_total_1 = 1200.0 * 2  # 2 people
    total_1 = room_total_1 + exp_total_1

    b1 = Booking(
        booking_number="VOY-1001",
        user_id=cust1.id,
        property_id=p1.id,
        check_in=check_in_1,
        check_out=check_out_1,
        total_nights=nights_1,
        total_guests=2,
        room_total=room_total_1,
        experience_total=exp_total_1,
        total_amount=total_1,
        status=BookingStatus.CONFIRMED,
        customer_notes="Looking forward to early morning sunrise trek."
    )
    db.add(b1)
    db.commit()
    db.refresh(b1)

    db.add(BookingRoom(
        booking_id=b1.id,
        room_id=r1_1.id,
        room_name=r1_1.name,
        nightly_price=5000.0,
        nights=nights_1,
        guests=2,
        subtotal=room_total_1
    ))
    db.add(BookingExperience(
        booking_id=b1.id,
        experience_id=e1_1.id,
        experience_title=e1_1.title,
        price=1200.0,
        pricing_model="per_person",
        participants=2,
        subtotal=exp_total_1,
        scheduled_date=check_in_1 + timedelta(days=1)
    ))
    db.commit()

    # Run VeriNova verification on b1
    VeriNovaService.verify_booking_transaction(db, b1)

    # Sample Booking 2: Sarah books Azure Horizon Luxury Villa
    check_in_2 = date.today() + timedelta(days=12)
    check_out_2 = date.today() + timedelta(days=14)
    nights_2 = 2
    room_total_2 = 12000.0 * nights_2
    exp_total_2 = 1800.0 * 2
    total_2 = room_total_2 + exp_total_2

    b2 = Booking(
        booking_number="VOY-1002",
        user_id=cust2.id,
        property_id=p3.id,
        check_in=check_in_2,
        check_out=check_out_2,
        total_nights=nights_2,
        total_guests=2,
        room_total=room_total_2,
        experience_total=exp_total_2,
        total_amount=total_2,
        status=BookingStatus.CONFIRMED,
        customer_notes="Anniversary celebration stay."
    )
    db.add(b2)
    db.commit()
    db.refresh(b2)

    db.add(BookingRoom(
        booking_id=b2.id,
        room_id=r3_1.id,
        room_name=r3_1.name,
        nightly_price=12000.0,
        nights=nights_2,
        guests=2,
        subtotal=room_total_2
    ))
    db.add(BookingExperience(
        booking_id=b2.id,
        experience_id=e3_1.id,
        experience_title=e3_1.title,
        price=1800.0,
        pricing_model="per_person",
        participants=2,
        subtotal=exp_total_2,
        scheduled_date=check_in_2
    ))
    db.commit()

    # Run VeriNova verification on b2
    VeriNovaService.verify_booking_transaction(db, b2)

    print("[OK] Database seeding successfully completed with real properties, rooms, experiences, and VeriNova verified bookings!")
    db.close()

if __name__ == "__main__":
    seed_database()
