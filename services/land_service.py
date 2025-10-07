from models.database import engine
from sqlalchemy import text
from datetime import datetime

def format_datetime(dt_value):
    """Helper function to format datetime values"""
    if dt_value is None:
        return None
    if isinstance(dt_value, str):
        try:
            parsed_dt = datetime.strptime(dt_value, '%Y-%m-%d %H:%M:%S.%f')
            return parsed_dt.strftime('%Y-%m-%d %H:%M:%S')
        except:
            return dt_value
    elif hasattr(dt_value, 'strftime'):
        return dt_value.strftime('%Y-%m-%d %H:%M:%S')
    else:
        return str(dt_value)

def get_lands_api(page=1, per_page=10, search=''):
    """
    Returns (lands_list, total_lands, page, per_page)
    """
    try:
        offset = (page - 1) * per_page
        search = (search or '').lower()

        with engine.connect() as conn:
            count_query = """
                SELECT COUNT(*) as total 
                FROM land_records lr
                LEFT JOIN farmers f ON lr.farmer_id = f.farmer_id
            """
            if search:
                search_condition = " OR ".join([
                    f"LOWER(lr.{col}) LIKE :search" 
                    for col in ['owner_name', 'village_name', 'sr_no', 'district_name', 'city_name']
                ] + [
                    "LOWER(f.farmer_name) LIKE :search"
                ])
                if search_condition:
                    count_query += f" WHERE {search_condition}"

            count_result = conn.execute(
                text(count_query),
                {"search": f"%{search}%" if search else "%%"}
            ).fetchone()
            total_lands = count_result[0] if count_result else 0

            query = """
                SELECT lr.id, lr.farmer_id, lr.sr_no, lr.district_name, lr.city_name, lr.village_name, 
                       lr.owner_name, lr.khewat_no, lr.kanal, lr.marle, lr.sarsai, lr.type, lr.min_land,
                       lr.land_owner_area_k, lr.land_owner_area_m, lr.land_owner_area_sarsai, 
                       lr.verify_status as status, lr.created_at, lr.updated_at,
                       f.farmer_name, f.mobile_number as farmer_phone
                FROM land_records lr
                LEFT JOIN farmers f ON lr.farmer_id = f.farmer_id
            """

            if search:
                search_condition_lands = " OR ".join([
                    f"LOWER(lr.{col}) LIKE :search" 
                    for col in ['owner_name', 'village_name', 'sr_no', 'district_name', 'city_name']
                ] + [
                    "LOWER(f.farmer_name) LIKE :search"
                ])
                if search_condition_lands:
                    query += f" WHERE {search_condition_lands}"

            query += f" ORDER BY lr.id LIMIT {per_page} OFFSET {offset}"

            result = conn.execute(
                text(query),
                {"search": f"%{search}%" if search else "%%"}
            )

            lands = []
            for row in result:
                try:
                    land = {
                        'id': getattr(row, 'id', None),
                        'farmer_id': getattr(row, 'farmer_id', None),
                        'farmer_name': getattr(row, 'farmer_name', None) or 'Unknown Farmer',
                        'farmer_phone': getattr(row, 'farmer_phone', None),
                        'sr_no': getattr(row, 'sr_no', None),
                        'owner_name': getattr(row, 'owner_name', None),
                        'district_name': getattr(row, 'district_name', None),
                        'city_name': getattr(row, 'city_name', None),
                        'village_name': getattr(row, 'village_name', None),
                        'khewat_no': getattr(row, 'khewat_no', None),
                        'kanal': float(getattr(row, 'kanal', 0) or 0),
                        'marle': float(getattr(row, 'marle', 0) or 0),
                        'sarsai': float(getattr(row, 'sarsai', 0) or 0),
                        'land_owner_area_k': float(getattr(row, 'land_owner_area_k', 0) or 0),
                        'land_owner_area_m': float(getattr(row, 'land_owner_area_m', 0) or 0),
                        'land_owner_area_sarsai': float(getattr(row, 'land_owner_area_sarsai', 0) or 0),
                        'type': getattr(row, 'type', None),
                        'min_land': getattr(row, 'min_land', None),
                        'status': getattr(row, 'status', None),
                        'created_at': format_datetime(getattr(row, 'created_at', None)),
                        'updated_at': format_datetime(getattr(row, 'updated_at', None))
                    }
                    lands.append(land)
                except Exception:
                    continue

        return lands, total_lands, page, per_page
    except Exception:
        raise

def get_land_by_id(land_id):
    """
    Returns land dict or None if not found.
    """
    try:
        with engine.connect() as conn:
            land_row = conn.execute(text("""
                SELECT lr.id, lr.sr_no, lr.district_name, lr.city_name, lr.village_name, lr.owner_name, 
                       lr.kanal, lr.marle, lr.sarsai, lr.type, lr.min_land,
                       lr.land_owner_area_k, lr.land_owner_area_m, lr.land_owner_area_sarsai, lr.verify_status as status, lr.created_at, lr.updated_at,
                       f.id as farmer_id, f.mobile_number
                FROM land_records lr
                LEFT JOIN farmers f ON lr.owner_name = f.farmer_name
                WHERE lr.id = :land_id
            """), {'land_id': land_id}).fetchone()

            if not land_row:
                return None

            land_data = {
                'id': land_row.id,
                'survey_no': land_row.sr_no or 'N/A',
                'district_name': land_row.district_name or 'N/A',
                'city_name': land_row.city_name or 'N/A',
                'village_name': land_row.village_name or 'N/A',
                'owner_name': land_row.owner_name or 'N/A',
                'kanal': land_row.kanal or 0,
                'marle': land_row.marle or 0,
                'sarsai': land_row.sarsai or 0,
                'type': land_row.type or 'N/A',
                'min_land': land_row.min_land or 0,
                'land_owner_area_k': land_row.land_owner_area_k or 0,
                'land_owner_area_m': land_row.land_owner_area_m or 0,
                'land_owner_area_sarsai': land_row.land_owner_area_sarsai or 0,
                'status': land_row.status or 'Unknown',
                'created_at': land_row.created_at.strftime('%Y-%m-%d %H:%M:%S') if land_row.created_at else None,
                'updated_at': land_row.updated_at.strftime('%Y-%m-%d %H:%M:%S') if land_row.updated_at else None,
                'farmer_id': land_row.farmer_id if hasattr(land_row, 'farmer_id') else None,
                'farmer_phone': land_row.mobile_number if hasattr(land_row, 'mobile_number') else None
            }

            return land_data
    except Exception:
        raise

def update_land(land_id, data):
    """
    Updates a land record with provided data dict.
    Returns True on success.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("""
                UPDATE land_records
                SET type = :type,
                    land_owner_area_k = :land_owner_area_k,
                    land_owner_area_m = :land_owner_area_m,
                    land_owner_area_sarsai = :land_owner_area_sarsai,
                    khewat_no = :khewat_no,
                    updated_at = :updated_at
                WHERE id = :land_id
            """), {
                'type': data.get('type'),
                'land_owner_area_k': data.get('land_owner_area_k'),
                'land_owner_area_m': data.get('land_owner_area_m'),
                'land_owner_area_sarsai': data.get('land_owner_area_sarsai'),
                'khewat_no': data.get('khewat_no'),
                'updated_at': datetime.utcnow(),
                'land_id': land_id
            })
            conn.commit()
        return True
    except Exception:
        raise
