import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, Integer, String, Text, create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = "sqlite:///./data/yt-dlp-web.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


class Base(DeclarativeBase):
    pass


class DownloadRecord(Base):
    __tablename__ = "download_records"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    url = Column(Text, nullable=False)
    title = Column(Text)
    thumbnail = Column(Text)
    duration = Column(Integer)
    uploader = Column(Text)
    webpage_url = Column(Text)

    # Format info
    format_id = Column(String)
    format_note = Column(String)
    ext = Column(String)
    resolution = Column(String)
    vcodec = Column(String)
    acodec = Column(String)
    fps = Column(Integer)
    filesize = Column(Integer)
    tbr = Column(Float)

    # Download state
    save_path = Column(Text)
    filename = Column(Text)
    status = Column(String, default="pending")  # pending / downloading / completed / failed
    progress = Column(Float, default=0)
    speed = Column(String)
    eta = Column(String)
    error_message = Column(Text)

    # Timestamps
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime)


def init_db():
    import os
    os.makedirs("data", exist_ok=True)
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
