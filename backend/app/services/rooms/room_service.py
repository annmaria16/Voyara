from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.room import Room, RoomImage, RoomAmenity
from app.models.property import Property
from app.schemas.room import RoomCreate, RoomUpdate

class RoomService:
    @staticmethod
    def create_room(db: Session, property_id: int, provider_id: int, data: RoomCreate) -> Room:
        # Verify property ownership
        prop = db.query(Property).filter(Property.id == property_id, Property.provider_id == provider_id).first()
        if not prop:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Property not found or you do not have permission to add rooms to it.",
            )

        room = Room(
            property_id=property_id,
            name=data.name.strip(),
            room_type=data.room_type.strip(),
            description=data.description.strip(),
            capacity=data.capacity,
            quantity=data.quantity,
            base_price=data.base_price,
            is_active=True
        )
        db.add(room)
        db.commit()
        db.refresh(room)

        # Amenities
        if data.amenities:
            for am in data.amenities:
                if am.strip():
                    db.add(RoomAmenity(room_id=room.id, amenity_name=am.strip()))
        
        # Images
        if data.images:
            for i, img_url in enumerate(data.images):
                if img_url.strip():
                    db.add(RoomImage(room_id=room.id, image_url=img_url.strip(), is_primary=(i == 0)))
        
        db.commit()
        db.refresh(room)
        return room

    @staticmethod
    def get_property_rooms(db: Session, property_id: int, provider_id: Optional[int] = None) -> List[Room]:
        if provider_id is not None:
            prop = db.query(Property).filter(Property.id == property_id, Property.provider_id == provider_id).first()
            if not prop:
                raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found or access denied.")
        return db.query(Room).filter(Room.property_id == property_id).all()

    @staticmethod
    def get_room_by_id(db: Session, room_id: int, provider_id: Optional[int] = None) -> Room:
        room = db.query(Room).filter(Room.id == room_id).first()
        if not room:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Room not found.")
        
        if provider_id is not None:
            prop = db.query(Property).filter(Property.id == room.property_id, Property.provider_id == provider_id).first()
            if not prop:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this room.")
        
        return room

    @staticmethod
    def update_room(db: Session, room_id: int, provider_id: int, data: RoomUpdate) -> Room:
        room = RoomService.get_room_by_id(db, room_id, provider_id)

        update_dict = data.model_dump(exclude_unset=True)
        amenities = update_dict.pop("amenities", None)
        images = update_dict.pop("images", None)

        for key, val in update_dict.items():
            setattr(room, key, val)

        if amenities is not None:
            db.query(RoomAmenity).filter(RoomAmenity.room_id == room.id).delete()
            for am in amenities:
                if am.strip():
                    db.add(RoomAmenity(room_id=room.id, amenity_name=am.strip()))

        if images is not None:
            db.query(RoomImage).filter(RoomImage.room_id == room.id).delete()
            for i, img_url in enumerate(images):
                if img_url.strip():
                    db.add(RoomImage(room_id=room.id, image_url=img_url.strip(), is_primary=(i == 0)))

        db.commit()
        db.refresh(room)
        return room

    @staticmethod
    def delete_room(db: Session, room_id: int, provider_id: int) -> dict:
        room = RoomService.get_room_by_id(db, room_id, provider_id)
        db.delete(room)
        db.commit()
        return {"message": "Room deleted successfully", "success": True}
