from models.database import engine
from models.farmer_model import Farmer, FarmerBankDetail
from models.land_model import LandRecord
from sqlalchemy import text, inspect
from datetime import datetime
from fetch_farmer_data import decrypt_account_no
import json
import os

def convert_to_acres(kanal, marle, sarsai):
    total_sarsai = (kanal * 20 * 9) + (marle * 9) + sarsai
    return total_sarsai / 1440

def load_bank_data():
    bank_data_path = os.path.join(os.path.dirname(__file__), '..', 'static', 'js', 'bankId.json')
    with open(bank_data_path, 'r') as f:
        bank_list = json.load(f)
    return {bank['BankId']: bank['BankName'] for bank in bank_list}

bank_id_to_name_map = load_bank_data()

def get_all_farmers_for_render():
    """
    Returns list of farmer dicts suitable for rendering in templates.
    """
    try:
        with engine.connect() as conn:
            farmers_result = conn.execute(text("SELECT * FROM farmers")).fetchall()
            farmers = []
            for farmer_row in farmers_result:
                farmer = dict(farmer_row._mapping)

                # Fetch lands
                lands_result = conn.execute(text("SELECT * FROM land_records WHERE farmer_id = :farmer_id"), {'farmer_id': farmer['farmer_id']}).fetchall()
                lands = []
                total_kanal = total_marle = total_sarsai = 0
                for land_row in lands_result:
                    land = dict(land_row._mapping)
                    lands.append(land)
                    total_kanal += land.get('kanal', 0) or 0
                    total_marle += land.get('marle', 0) or 0
                    total_sarsai += land.get('sarsai', 0) or 0

                farmer['lands'] = lands
                farmer['total_area_acres'] = convert_to_acres(total_kanal, total_marle, total_sarsai)

                # Fetch bank details
                bank_detail_row = conn.execute(text("SELECT * FROM farmer_bank_details WHERE farmer_id = :farmer_id"), {'farmer_id': farmer['farmer_id']}).fetchone()
                if bank_detail_row:
                    bank_detail = dict(bank_detail_row._mapping)
                    if bank_detail.get('account_no_encrypted'):
                        bank_detail['account_no'] = decrypt_account_no(bank_detail['account_no_encrypted'])
                    else:
                        bank_detail['account_no'] = 'N/A'
                    bank_detail['bank_name'] = bank_id_to_name_map.get(bank_detail.get('bank_id'), 'Unknown Bank')
                    farmer['bank_detail'] = bank_detail
                else:
                    farmer['bank_detail'] = None

                farmers.append(farmer)
            return farmers
    except Exception:
        raise

def get_farmers_api(page=1, per_page=10, search='', source_api='', total_area=''):
    """
    Returns a tuple: (farmers_list, total_farmers, page, per_page)
    where farmers_list is suitable for jsonify in API.
    """
    try:
        offset = (page - 1) * per_page
        search = (search or '').lower()

        with engine.connect() as conn:
            count_query = "SELECT COUNT(*) as total FROM farmers f"
            conditions = []
            params = {}

            if search:
                search_condition = " OR ".join([
                    f"LOWER(f.{col}) LIKE :search" 
                    for col in ['farmer_name', 'father_name', 'mobile_number', 'aadhar_number']
                ])
                conditions.append(f"({search_condition})")
                params['search'] = f"%{search}%"
            
            if source_api:
                conditions.append("f.source_api = :source_api")
                params['source_api'] = source_api

            if total_area == '0':
                conditions.append("(SELECT COUNT(*) FROM land_records lr WHERE lr.farmer_id = f.farmer_id) = 0")

            if conditions:
                count_query += " WHERE " + " AND ".join(conditions)
            
            count_result = conn.execute(text(count_query), params).fetchone()
            total_farmers = count_result[0] if count_result else 0

            query = """
                SELECT f.id, f.farmer_id, f.farmer_name, f.father_name, f.grandfather_name,
                       f.mobile_number, f.aadhar_number, f.village_name, f.source_api,
                       f.created_at, f.updated_at,
                       f.owner_area, f.final_owner_area,
                       (SELECT COUNT(*) FROM land_records lr WHERE lr.farmer_id = f.farmer_id) as total_land_records,
                       (SELECT COALESCE(SUM(lr.kanal), 0) FROM land_records lr WHERE lr.farmer_id = f.farmer_id) as total_kanal,
                       (SELECT COALESCE(SUM(lr.marle), 0) FROM land_records lr WHERE lr.farmer_id = f.farmer_id) as total_marle,
                       (SELECT COALESCE(SUM(lr.sarsai), 0) FROM land_records lr WHERE lr.farmer_id = f.farmer_id) as total_sarsai,
                       fbd.bank_id, fbd.account_holder_name, fbd.account_no_encrypted, fbd.ifsc_code, fbd.branch_name
                FROM farmers f
                LEFT JOIN farmer_bank_details fbd ON f.farmer_id = fbd.farmer_id
            """

            if conditions:
                query += " WHERE " + " AND ".join(conditions)
            
            query += f" GROUP BY f.id ORDER BY f.id LIMIT {per_page} OFFSET {offset}"

            result = conn.execute(text(query), params)

            farmers = []
            for row in result:
                farmer = {
                    'id': row.id,
                    'farmer_id': row.farmer_id,
                    'farmer_name': row.farmer_name,
                    'father_name': row.father_name,
                    'grandfather_name': row.grandfather_name,
                    'mobile_number': row.mobile_number,
                    'aadhar_number': row.aadhar_number,
                    'village_name': row.village_name,
                    'source_api': row.source_api,
                    'created_at': datetime.strptime(row.created_at, '%Y-%m-%d %H:%M:%S.%f').strftime('%Y-%m-%d %H:%M:%S') if isinstance(row.created_at, str) else (row.created_at.strftime('%Y-%m-%d %H:%M:%S') if row.created_at else None),
                    'updated_at': datetime.strptime(row.updated_at, '%Y-%m-%d %H:%M:%S.%f').strftime('%Y-%m-%d %H:%M:%S') if isinstance(row.updated_at, str) else (row.updated_at.strftime('%Y-%m-%d %H:%M:%S') if row.updated_at else None),
                    'total_land_records': row.total_land_records or 0,
                    'total_land': row.owner_area,
                    'area_under_cultivation': row.final_owner_area,
                    'bank_detail': None
                }
                if row.account_no_encrypted:
                    farmer['bank_detail'] = {
                        'bank_id': row.bank_id,
                        'account_holder_name': row.account_holder_name,
                        'account_no': decrypt_account_no(row.account_no_encrypted),
                        'ifsc_code': row.ifsc_code,
                        'branch_name': row.branch_name,
                        'bank_name': bank_id_to_name_map.get(row.bank_id, 'Unknown Bank')
                    }
                farmers.append(farmer)

        return farmers, total_farmers, page, per_page
    except Exception:
        raise

def get_farmer_by_id(farmer_id):
    """
    Returns a detailed farmer dict (including lands and bank detail) for API use.
    Raises if not found.
    """
    try:
        with engine.connect() as conn:
            farmer_row = conn.execute(text("""
                SELECT {}
                FROM farmers
                WHERE id = :id
            """.format(", ".join([col.name for col in inspect(Farmer).columns]))), {'id': farmer_id}).fetchone()
            
            if not farmer_row:
                return None

            farmer = {col.name: getattr(farmer_row, col.name) for col in inspect(Farmer).columns}
            for key, value in farmer.items():
                if isinstance(value, datetime):
                    farmer[key] = value.strftime('%Y-%m-%d %H:%M:%S')

            lands_result = conn.execute(text("""
                SELECT {}
                FROM land_records
                WHERE farmer_id = :farmer_id
            """.format(", ".join([col.name for col in inspect(LandRecord).columns]))),
                {'farmer_id': farmer['farmer_id']}
            ).fetchall()

            lands = []
            for land_row in lands_result:
                land_data = {col.name: getattr(land_row, col.name) for col in inspect(LandRecord).columns}
                for key, value in land_data.items():
                    if isinstance(value, datetime):
                        land_data[key] = value.strftime('%Y-%m-%d %H:%M:%S')
                    elif value is None:
                        if key in ['owner_name', 'village_name', 'city_name', 'district_name',
                                  'area_type', 'khewat_no', 'khasra_no', 'period', 'source_api']:
                            land_data[key] = ''
                        elif key in ['land_owner_area_k', 'land_owner_area_m', 'land_owner_area_sarsai',
                                    'kanal', 'marle', 'sarsai', 'kanal1', 'marle1', 'sarsai1']:
                            land_data[key] = 0.0
                        elif key in ['owner_type', 'type', 'mapped_area', 'license_id', 'verify_status',
                                    'commodity_id', 'min_land', 'auction']:
                            land_data[key] = 0
                lands.append(land_data)

            farmer['lands'] = lands

            bank_detail_row = conn.execute(text("""
                SELECT {}
                FROM farmer_bank_details
                WHERE farmer_id = :farmer_id
            """.format(", ".join([col.name for col in inspect(FarmerBankDetail).columns]))),
                {'farmer_id': farmer['farmer_id']}
            ).fetchone()

            if bank_detail_row:
                bank_detail = {col.name: getattr(bank_detail_row, col.name) for col in inspect(FarmerBankDetail).columns}
                if bank_detail.get('account_no_encrypted'):
                    bank_detail['account_no'] = decrypt_account_no(bank_detail['account_no_encrypted'])
                else:
                    bank_detail['account_no'] = 'N/A'
                farmer['bank_detail'] = bank_detail
            else:
                farmer['bank_detail'] = None

            return farmer
    except Exception:
        raise

def get_farmer_for_render(farmer_id):
    """
    Returns a farmer dict prepared for rendering (similar to profile route).
    """
    try:
        with engine.connect() as conn:
            farmer_row = conn.execute(text("SELECT * FROM farmers WHERE id = :id"), {'id': farmer_id}).fetchone()
            if not farmer_row:
                return None
            farmer = dict(farmer_row._mapping)

            lands_result = conn.execute(text("SELECT * FROM land_records WHERE farmer_id = :farmer_id"), {'farmer_id': farmer['farmer_id']}).fetchall()
            lands = []
            total_kanal = total_marle = total_sarsai = 0
            for land_row in lands_result:
                land = dict(land_row._mapping)
                lands.append(land)
                total_kanal += land.get('kanal', 0) or 0
                total_marle += land.get('marle', 0) or 0
                total_sarsai += land.get('sarsai', 0) or 0

            farmer['lands'] = lands
            farmer['total_area_acres'] = convert_to_acres(total_kanal, total_marle, total_sarsai)

            bank_detail_row = conn.execute(text("SELECT * FROM farmer_bank_details WHERE farmer_id = :farmer_id"), {'farmer_id': farmer['farmer_id']}).fetchone()
            if bank_detail_row:
                bank_detail = dict(bank_detail_row._mapping)
                if bank_detail.get('account_no_encrypted'):
                    bank_detail['account_no'] = decrypt_account_no(bank_detail['account_no_encrypted'])
                else:
                    bank_detail['account_no'] = 'N/A'
                bank_detail['bank_name'] = bank_id_to_name_map.get(bank_detail.get('bank_id'), 'Unknown Bank')
                farmer['bank_detail'] = bank_detail
            else:
                farmer['bank_detail'] = None

            return farmer
    except Exception:
        raise
