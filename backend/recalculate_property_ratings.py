import os
import sys
from sqlalchemy.orm import Session
from sqlalchemy import func

sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models.property import Property
from app.models.review import Review

def recalculate_all_ratings():
    db: Session = SessionLocal()
    print("[*] Recalculating all property ratings and review counts from real PostgreSQL reviews...")
    
    try:
        properties = db.query(Property).all()
        updated_count = 0

        for prop in properties:
            # Query actual reviews for this property
            reviews = db.query(Review).filter(Review.property_id == prop.id).all()
            actual_count = len(reviews)
            
            if actual_count > 0:
                avg_rating = round(sum(r.rating for r in reviews) / actual_count, 1)
            else:
                avg_rating = 0.0

            old_rating = prop.rating
            old_count = prop.review_count

            prop.rating = avg_rating
            prop.review_count = actual_count
            updated_count += 1
            print(f" -> Property #{prop.id} '{prop.name}': Rating {old_rating} -> {prop.rating}, Reviews {old_count} -> {prop.review_count}")

        db.commit()
        print(f"[OK] Successfully updated {updated_count} properties.")

    except Exception as e:
        db.rollback()
        print(f"[ERROR] Failed to recalculate ratings: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    recalculate_all_ratings()
