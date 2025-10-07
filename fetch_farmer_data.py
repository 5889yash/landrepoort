import os
import shutil
import time
import random # Added for exponential backoff jitter
from datetime import datetime
import requests
from tqdm import tqdm
from dotenv import load_dotenv

# For AES decryption
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import padding
import base64

# Import the new FarmerBankDetail model
from models.farmer_model import Farmer, FarmerBankDetail
from models.land_model import LandRecord
from models.database import Base # Import Base from the shared database file

# Load environment variables
load_dotenv()

# Import Base, engine, Session, DATA_DIR, DB_NAME, DB_PATH from the shared database file
from models.database import engine, Session, DATA_DIR, DB_NAME, DB_PATH

# BACKUP_DIR is specific to this script
BACKUP_DIR = DATA_DIR / "backups"
BACKUP_DIR.mkdir(exist_ok=True)

def backup_database():
    """Create a timestamped backup of the database."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = BACKUP_DIR / f"farmer_land_records_{timestamp}.db"
    
    if DB_PATH.exists():
        shutil.copy2(DB_PATH, backup_path)
        print(f"\nDatabase backed up to: {backup_path}")
    else:
        print("\nNo existing database found, creating a new one.")
    
    # Keep only the last 5 backups
    backups = sorted(BACKUP_DIR.glob("farmer_land_records_*.db"), key=os.path.getmtime)
    for old_backup in backups[:-5]:
        try:
            os.remove(old_backup)
        except Exception as e:
            print(f"Error removing old backup {old_backup}: {e}")

def delete_database():
    """Delete the existing database file."""
    if DB_PATH.exists():
        try:
            os.remove(DB_PATH)
            print(f"Existing database '{DB_NAME}' removed.")
        except Exception as e:
            print(f"Error removing database {DB_PATH}: {e}")
    else:
        print(f"No existing database '{DB_NAME}' found to remove.")

# API endpoints
FARMER_DETAILS_APIS = [
    {"name": "PNC", "url": "https://apifarmerlandmapping.emandikaran-pb.in/api/EMandiKaranIntegrationApi/getFarmerDetailWithLicense/159/20185"},
    {"name": "PM", "url": "https://apifarmerlandmapping.emandikaran-pb.in/api/EMandiKaranIntegrationApi/getFarmerDetailWithLicense/159/20186"},
    {"name": "ATC", "url": "https://apifarmerlandmapping.emandikaran-pb.in/api/EMandiKaranIntegrationApi/getFarmerDetailWithLicense/159/8030"},
    {"name": "BTC", "url": "https://apifarmerlandmapping.emandikaran-pb.in/api/EMandiKaranIntegrationApi/getFarmerDetailWithLicense/159/120637"},
    {"name": "STC-RPP", "url": "https://apifarmerlandmapping.emandikaran-pb.in/api/EMandiKaranIntegrationApi/getFarmerDetailWithLicense/159/20181"},
    {"name": "STC-BHU", "url": "https://apifarmerlandmapping.emandikaran-pb.in/api/EMandiKaranIntegrationApi/getFarmerDetailWithLicense/61/20174"}
]

FARMER_MAPPING_BASE_URL = "https://apifarmerlandmapping.emandikaran-pb.in/api/EMandiKaranIntegrationApi/getFarmermappingDetail"
FARMER_PAYMENT_OPTIONS_BASE_URL = "https://farmerregistrationapi.anaajkharid.in/api/FarmerRegistrationApi/GetFarmerPaymentOptionsDetails"

# Decryption key and IV (from user's instruction)
# let key1 = CryptoJS.enc.Utf8.parse('8080808080808080');
# let iv1 = CryptoJS.enc.Utf8.parse('8080808080808080');
AES_KEY = b'8080808080808080' # 16 bytes for AES-128
AES_IV = b'8080808080808080' # 16 bytes for AES-128

def decrypt_account_no(encrypted_account_no):
    """Decrypts an AES-encrypted account number using the provided key and IV."""
    try:
        # The input is Base64 encoded, so decode it first
        encrypted_bytes = base64.b64decode(encrypted_account_no)

        # Create an AES cipher object
        cipher = Cipher(algorithms.AES(AES_KEY), modes.CBC(AES_IV), backend=default_backend())
        decryptor = cipher.decryptor()

        # Decrypt the data
        decrypted_padded_bytes = decryptor.update(encrypted_bytes) + decryptor.finalize()

        # Unpad the decrypted data (PKCS7 padding)
        unpadder = padding.PKCS7(algorithms.AES.block_size).unpadder()
        decrypted_bytes = unpadder.update(decrypted_padded_bytes) + unpadder.finalize()

        return decrypted_bytes.decode('utf-8')
    except Exception as e:
        print(f"Error decrypting account number: {e}")
        return None

def fetch_data_from_api(api_url):
    """Fetch data from the API with proper headers, retries, and error handling."""
    max_retries = 3
    base_delay = 1  # Initial delay in seconds
    
    # Browser-like headers to prevent blocking
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
        'Connection': 'keep-alive',
        'Origin': 'https://apifarmerlandmapping.emandikaran-pb.in',
        'Referer': 'https://apifarmerlandmapping.emandikaran-pb.in/',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin'
    }
    
    for attempt in range(max_retries):
        try:
            response = requests.get(
                api_url,
                headers=headers,
                timeout=120,  # 2 minutes timeout
                verify=True,
                allow_redirects=True
            )
            response.raise_for_status()
            return response.json()
            
        except (requests.exceptions.RequestException, 
                requests.exceptions.Timeout,
                requests.exceptions.SSLError,
                requests.exceptions.ConnectionError) as e:
            
            if attempt == max_retries - 1:  # Last attempt
                print(f"❌ Failed after {max_retries} attempts for {api_url}")
                print(f"   Error: {str(e)}")
                return None
                
            # Exponential backoff with jitter
            delay = base_delay * (2 ** attempt) + (random.uniform(0, 1))
            print(f"⚠️ Attempt {attempt + 1} failed for {api_url}")
            print(f"   Retrying in {delay:.1f} seconds...")
            time.sleep(delay)
            
    return None

def save_farmer_data(farmer_data, source_name):
    """Save farmer data to the database."""
    session = Session()
    try:
        # Create new record (database is recreated on each run, so no need to check for existing)
        farmer = Farmer(
            farmer_id=farmer_data.get('FarmerId'),
            farmer_name=farmer_data.get('FarmerName', ''),
            father_name=farmer_data.get('FatherName', ''),
            grandfather_name=farmer_data.get('GrandFatherName', ''),
            district_name=farmer_data.get('DistrictName', ''),
            city_name=farmer_data.get('CityName', ''),
            village_name=farmer_data.get('VillageName', ''),
            owner_area=farmer_data.get('Owner_Area'),
            final_owner_area=farmer_data.get('finalOwner_Area'),
            update_owner_area=farmer_data.get('updateOwner_Area'),
            aadhar_number=farmer_data.get('AadharNumber'),
            mobile_number=farmer_data.get('MobileNumber'),
            owner_type=farmer_data.get('ownertype', 0),
            verify_status=str(farmer_data.get('verifystatus', 'false')).lower(),
            auction=farmer_data.get('auction', 0),
            source_api=source_name
        )
        session.add(farmer)
        print(f"Added new farmer: {farmer_data.get('FarmerName')} (ID: {farmer_data.get('FarmerId')})")
        
        session.commit()
    except Exception as e:
        session.rollback()
        print(f"Error saving farmer data: {str(e)}")
    finally:
        session.close()

def save_land_records_bulk(records_data, farmer_id):
    """Save a list of land record data to the database in bulk."""
    session = Session()
    try:
        for record_data in records_data:
            # Create new record (database is recreated on each run, so no need to check for existing)
            record = LandRecord(
                id=record_data.get('Id'),
                farmer_id=farmer_id,
                sr_no=record_data.get('Srno'),
                owner_id=record_data.get('OwnerId'),
                owner_name=record_data.get('OwnerName', ''),
                revenue_village_id=record_data.get('Revenue_VillageId'),
                village_name=record_data.get('VillageName', ''),
                city_name=record_data.get('CityName', ''),
                district_name=record_data.get('DistrictName', ''),
                area_type=record_data.get('AreaType', ''),
                owner_area=record_data.get('Owner_Area', ''),
                land_owner_area_k=record_data.get('LandOwner_Area_K'),
                land_owner_area_m=record_data.get('LandOwner_Area_M'),
                land_owner_area_sarsai=record_data.get('LandOwner_Area_Sarsai'),
                owner_type=record_data.get('ownertype'),
                khewat_no=record_data.get('Khewat_No', ''),
                khasra_no=record_data.get('Khasra_No', ''),
                period=record_data.get('period', ''),
                type=record_data.get('Type'),
                kanal=record_data.get('Kanal'),
                marle=record_data.get('Marle'),
                sarsai=record_data.get('Sarsai'),
                mapped_area=record_data.get('Mappedarea'),
                license_id=record_data.get('LicenseId'),
                verify_status=record_data.get('VerifyStatus'),
                kanal1=record_data.get('Kanal1'),
                marle1=record_data.get('Marle1'),
                sarsai1=record_data.get('Sarsai1'),
                commodity_id=record_data.get('CommodityId'),
                min_land=record_data.get('minland'),
                auction=record_data.get('auction', 0)
            )
            session.add(record)
        
        session.commit()
        print(f"Saved {len(records_data)} land records for farmer ID: {farmer_id}")
    except Exception as e:
        session.rollback()
        print(f"Error saving land records for farmer ID {farmer_id}: {str(e)}")
    finally:
        session.close()

def fetch_farmer_bank_details(farmer_id):
    """Fetch bank details for a specific farmer."""
    url = f"{FARMER_PAYMENT_OPTIONS_BASE_URL}/{farmer_id}"
    print(f"Fetching bank details for farmer ID: {farmer_id} from {url}")
    data = fetch_data_from_api(url)
    if data and data.get('success') and 'responseData' in data:
        return data['responseData']
    return None

def save_farmer_bank_details(bank_data, farmer_id):
    """Save or update farmer bank details to the database."""
    session = Session()
    try:
        # Check if bank details already exist for this farmer
        existing_bank_detail = session.query(FarmerBankDetail).filter_by(farmer_id=farmer_id).first()

        if existing_bank_detail:
            # Update existing record
            existing_bank_detail.bank_id = bank_data.get('BankId')
            existing_bank_detail.account_holder_name = bank_data.get('AccountHolderName', '')
            existing_bank_detail.account_no_encrypted = bank_data.get('AccountNo', '')
            existing_bank_detail.ifsc_code = bank_data.get('IFSCCode', '')
            existing_bank_detail.branch_name = bank_data.get('BranchName', '')
            print(f"Updated bank details for farmer ID: {farmer_id}")
        else:
            # Create new record
            bank_detail = FarmerBankDetail(
                farmer_id=farmer_id,
                bank_id=bank_data.get('BankId'),
                account_holder_name=bank_data.get('AccountHolderName', ''),
                account_no_encrypted=bank_data.get('AccountNo', ''),
                ifsc_code=bank_data.get('IFSCCode', ''),
                branch_name=bank_data.get('BranchName', '')
            )
            session.add(bank_detail)
            print(f"Added bank details for farmer ID: {farmer_id}")
        
        session.commit()
    except Exception as e:
        session.rollback()
        print(f"Error saving bank details for farmer ID {farmer_id}: {str(e)}")
    finally:
        session.close()

def fetch_farmer_mapping_details(farmer_id):
    """Fetch land mapping details for a specific farmer."""
    url = f"{FARMER_MAPPING_BASE_URL}/{farmer_id}"
    try:
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        data = response.json()
        
        if data and data.get('success') and 'responseData' in data:
            return data['responseData']
        return None
    except requests.exceptions.RequestException as e:
        print(f"Error fetching mapping details for farmer {farmer_id}: {str(e)}")
        return None

def process_farmer_mapping_details():
    """Process land mapping details for all farmers in the database."""
    session = Session()
    try:
        # Get all unique farmer IDs with their source API
        farmers = session.query(Farmer.farmer_id, Farmer.source_api).distinct().all()
        total_farmers = len(farmers)
        
        if total_farmers == 0:
            print("No farmers found in the database.")
            return
            
        print(f"\nFound {total_farmers} farmers to process for land mapping details")
        
        # Initialize progress bar for farmers
        with tqdm(total=total_farmers, desc="Processing land records") as pbar:
            for farmer_id, source_api in farmers:
                # Update progress bar description with current farmer ID and source
                pbar.set_description(f"Processing {source_api} - ID: {farmer_id}")
                
                try:
                    # Fetch mapping details for this farmer
                    mapping_data = fetch_farmer_mapping_details(farmer_id)
                    
                    if mapping_data:
                        # Save all land records for the current farmer in bulk
                        save_land_records_bulk(mapping_data, farmer_id)
                    
                except Exception as e:
                    print(f"\nError processing farmer {farmer_id}: {str(e)}")
                    # Continue with next farmer even if one fails
                
                # Update progress bar
                pbar.update(1)
                
    except Exception as e:
        print(f"Error processing farmer mapping details: {str(e)}")
    finally:
        session.close()

def process_all_farmer_bank_details():
    """Process bank details for all farmers in the database."""
    session = Session()
    try:
        farmers = session.query(Farmer.farmer_id).distinct().all()
        total_farmers = len(farmers)

        if total_farmers == 0:
            print("No farmers found in the database to fetch bank details for.")
            return

        print(f"\nFound {total_farmers} farmers to process for bank details")

        with tqdm(total=total_farmers, desc="Processing bank details") as pbar:
            for (farmer_id,) in farmers: # Unpack the tuple
                pbar.set_description(f"Processing bank details for Farmer ID: {farmer_id}")
                try:
                    bank_data = fetch_farmer_bank_details(farmer_id)
                    if bank_data:
                        save_farmer_bank_details(bank_data, farmer_id)
                except Exception as e:
                    print(f"\nError processing bank details for farmer {farmer_id}: {str(e)}")
                pbar.update(1)
    except Exception as e:
        print(f"Error in process_all_farmer_bank_details: {str(e)}")
    finally:
        session.close()

def fetch_all_farmers():
    """Fetch all farmers from all APIs and return a list of unique farmers."""
    all_farmers = []
    farmer_ids = set()  # To track unique farmers by ID and source
    
    print("\n=== Fetching All Farmers ===")
    for api in tqdm(FARMER_DETAILS_APIS, desc="Fetching from APIs"):
        print(f"\nFetching data from {api['name']} API...")
        data = fetch_data_from_api(api['url'])
        
        if data and data.get('success') and 'responseData' in data:
            farmers = data['responseData']
            print(f"Found {len(farmers)} farmers in {api['name']} API")
            
            # Add source information and filter duplicates
            for farmer in farmers:
                farmer['source_api'] = api['name']
                farmer_id = (farmer.get('FarmerId'), api['name'])
                if farmer_id not in farmer_ids:
                    farmer_ids.add(farmer_id)
                    all_farmers.append(farmer)
    
    print(f"\nTotal unique farmers found: {len(all_farmers)}")
    return all_farmers

def save_farmers_to_db(farmers):
    """Save list of farmers to database with progress tracking."""
    print("\n=== Saving Farmers to Database ===")
    with tqdm(total=len(farmers), desc="Saving farmers") as pbar:
        for farmer in farmers:
            save_farmer_data(farmer, farmer['source_api'])
            pbar.update(1)

def main():
    print("Starting data fetch process...")
    
    # Create backup before starting
    backup_database()
    
    # Dispose of the engine to close all connections before deleting the database
    engine.dispose()
    
    # Delete existing database to start fresh
    delete_database()
    
    # Create tables on the fresh database
    Base.metadata.create_all(engine)
    
    start_time = time.time()
    
    try:
        # Step 1: Fetch all unique farmers from all APIs
        all_farmers = fetch_all_farmers()
        
        # Step 2: Save all farmers to database
        save_farmers_to_db(all_farmers)
        
        # Step 3: Process land records for all farmers
        print("\n=== Processing Land Records ===")
        process_farmer_mapping_details()

        # Step 4: Process bank details for all farmers
        print("\n=== Processing Bank Details ===")
        process_all_farmer_bank_details()
        
        # Calculate and display total time taken
        total_time = time.time() - start_time
        hours, rem = divmod(total_time, 3600)
        minutes, seconds = divmod(rem, 60)
        print(f"\nData fetch and save process completed in {int(hours):02d}:{int(minutes):02d}:{int(seconds):02d}")
        
    except KeyboardInterrupt:
        print("\nProcess interrupted by user. Exiting gracefully...")
    except Exception as e:
        print(f"\nAn error occurred: {str(e)}")
        raise

if __name__ == "__main__":
    main()
