# Voyara Backend API

FastAPI backend with SQLAlchemy ORM, Pydantic schemas, and the VeriNova Transaction Verification engine.

## Database & Models
- `User` (`CUSTOMER`, `PROVIDER`, `ADMIN`)
- `ProviderProfile`
- `Property` (`Hotel`, `Homestay`, `Resort`, `Camp`, `Cottage`, `Villa`), `PropertyImage`, `PropertyAmenity`
- `Room`, `RoomImage`, `RoomAmenity`
- `PropertyAvailability`, `RoomAvailability`
- `Experience`, `ExperienceSchedule`, `ExperienceAvailability`
- `Booking`, `BookingRoom`, `BookingExperience`
- `VerificationResult`, `VerificationCheck`

## Run Backend

```bash
pip install -r requirements.txt
python -m app.seed
uvicorn app.main:app --reload --port 8000
```

## OTP & SMS Modes (.env)

- **Development Mode** (`OTP_PROVIDER=development`):
  Suppresses 2Factor API calls to preserve credits. Uses development OTP `123456` for automated testing.
- **Production Mode** (`OTP_PROVIDER=2factor`):
  Transmits real SMS to physical SIM cards via 2Factor.in (`TWOFACTOR_API_KEY`). Refuses development OTPs.
