# 🌾 AgriTech Data Portal

**A Modern Agricultural Land Management & Data Viewing System**

AgriTech Data Portal is a professional, read-only web application designed for viewing and managing farmer and land record data. Built with Flask and modern web technologies, it provides a clean, efficient interface for agricultural data management.

## 📋 Table of Contents

- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Installation](#-installation)
- [Usage](#-usage)
- [API Endpoints](#-api-endpoints)
- [Database Schema](#-database-schema)
- [Print Features](#-print-features)
- [Area Conversion](#-area-conversion)
- [Screenshots](#-screenshots)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

### 🔍 **Data Viewing & Search**
- **Farmers Directory**: Browse and search farmer records with comprehensive information
- **Land Records Directory**: View land ownership records with location and area details
- **Advanced Search**: Text-based search across multiple fields (names, locations, IDs)
- **Pagination**: Efficient data browsing with page navigation

### 📊 **Dashboard Analytics**
- **Statistics Cards**: Real-time counts of farmers, land records, total area, and verified records
- **Compact Design**: Space-efficient statistics display
- **Area Conversion**: Automatic conversion between traditional units and acres

### 🖨️ **Professional Printing**
- **Individual Profile Printing**: A4-optimized farmer profile printouts
- **Professional Layout**: Official document formatting suitable for government use
- **Single Page Design**: Comprehensive information on one A4 page
- **Print-Optimized CSS**: Clean, professional appearance

### 💼 **Modern Interface**
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Professional Theme**: Clean, modern UI with AgriTech branding
- **Loading States**: Smooth user experience with loading indicators
- **Toast Notifications**: User-friendly error and success messages

### 🔐 **Read-Only Architecture**
- **Data Viewing Focus**: Optimized for viewing and browsing data
- **Export Capabilities**: Bulk export functionality (A4 format)
- **No Data Modification**: Secure, view-only access to prevent accidental changes

## 🛠️ Technology Stack

### **Backend**
- **Flask 3.0.0**: Python web framework
- **SQLAlchemy 2.0.23**: Database ORM
- **SQLite**: Database engine

### **Frontend**
- **HTML5/CSS3**: Modern web standards
- **Bootstrap 5.3.2**: Responsive UI framework
- **JavaScript (ES6+)**: Interactive functionality
- **Bootstrap Icons**: Professional iconography

### **Fonts & Design**
- **Inter & Poppins**: Modern typography
- **Custom CSS Variables**: Consistent theming
- **Professional Color Palette**: Blue/green gradient theme

## 🚀 Installation

### **Prerequisites**
- Python 3.8 or higher
- pip (Python package installer)

### **Setup Steps**

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd agritech-data-portal
   ```

2. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Database Setup**
   - Ensure the SQLite database file exists at `data/farmer_land_records.db`
   - The application will automatically connect to the database

4. **Run the Application**
   ```bash
   python app.py
   ```

5. **Access the Portal**
   - Open your browser and go to `http://localhost:5000`
   - The application will be running on port 5000

## 📱 Usage

### **Navigation**
- **Dashboard**: Overview with statistics and quick access
- **Farmers Directory**: Browse and search farmer records
- **Land Records Directory**: View land ownership information

### **Farmer Management**
1. **Browse Farmers**: View list of farmers with pagination
2. **Search**: Use the search box to find specific farmers
3. **View Details**: Click "View" to see comprehensive farmer profile
4. **Print Profile**: Generate professional A4 printouts

### **Land Records**
1. **Browse Records**: View land records with farmer associations
2. **Search**: Find records by farmer name, location, or other criteria
3. **View Details**: See comprehensive land record information

### **Export & Printing**
- **Individual Prints**: Print farmer profiles or land records
- **Bulk Export**: Export multiple records in A4 format (coming soon)

## 🔌 API Endpoints

### **Statistics**
```
GET /api/stats
```
Returns dashboard statistics (farmers count, land records count, total area)

### **Farmers**
```
GET /api/farmers?page={page}&search={search_term}
```
Retrieves paginated farmer data with optional search

```
GET /api/farmer/{farmer_id}
```
Gets detailed information for a specific farmer including land records

### **Land Records**
```
GET /api/lands?page={page}&search={search_term}
```
Retrieves paginated land records with farmer information

```
GET /api/land/{land_id}
```
Gets detailed information for a specific land record

## 🗄️ Database Schema

### **Farmers Table**
- `id`: Primary key
- `farmer_id`: Unique farmer identifier
- `farmer_name`: Full name of the farmer
- `father_name`: Father/husband name
- `grandfather_name`: Grandfather name
- `mobile_number`: Contact number
- `aadhar_number`: Aadhar card number
- `village_name`, `city_name`, `district_name`: Location information
- `owner_area`, `final_owner_area`, `update_owner_area`: Land area details
- `verify_status`: Verification status (0/1)
- `created_at`, `updated_at`: Timestamps

### **Land Records Table**
- `id`: Primary key
- `farmer_id`: Foreign key to farmers table
- `sr_no`: Serial number
- `owner_name`: Land owner name
- `village_name`, `city_name`, `district_name`: Location details
- `khewat_no`: Khewat number
- `kanal`, `marle`, `sarsai`: Traditional area measurements
- `land_owner_area_k`, `land_owner_area_m`, `land_owner_area_sarsai`: Cultivation area
- `type`: Land cultivation type
- `verify_status`: Verification status
- `created_at`, `updated_at`: Timestamps

## 🖨️ Print Features

### **Farmer Profile Printing**
- **A4 Optimized**: Perfect fit for standard A4 paper
- **Professional Layout**: Official document styling
- **Comprehensive Information**: All farmer details on one page
- **Land Records Summary**: Compact table with essential land information

### **Print Specifications**
- **Page Size**: A4 (210 × 297 mm)
- **Margins**: 15mm on all sides
- **Font**: Segoe UI family
- **Font Sizes**: 8px-18px for optimal readability
- **Color**: Professional blue theme with print-safe colors

## 📐 Area Conversion

The system uses accurate land area conversion rates:

### **Conversion Rates**
- **1 acre = 8 kanal**
- **1 kanal = 20 marle**
- **1 marla = 9 sarsai**
- **1 acre = 1,440 sarsai** (total conversion)

### **Display Format**
- **Primary**: Acres (e.g., "2.50 acres")
- **Secondary**: Traditional units (e.g., "20K/0M/0S")
- **Dual Format**: Both displayed for user convenience

## 📊 Screenshots

### Dashboard
![Dashboard with statistics and navigation]

### Farmers Directory
![Farmers list with search and pagination]

### Farmer Profile
![Detailed farmer profile modal]

### Land Records
![Land records with farmer information]

### Print Output
![Professional A4 farmer profile printout]

## 🤝 Contributing

We welcome contributions to improve the AgriTech Data Portal! 

### **Development Guidelines**
1. **Read-Only Focus**: Maintain the view-only architecture
2. **Professional Design**: Follow the established UI/UX patterns
3. **A4 Print Optimization**: Ensure all print features work on A4 paper
4. **Area Conversion**: Use the established conversion rates
5. **Responsive Design**: Test on multiple device sizes

### **Code Style**
- **Python**: Follow PEP 8 guidelines
- **JavaScript**: Use ES6+ features and modern practices
- **CSS**: Use CSS custom properties and modern layout techniques
- **HTML**: Semantic HTML5 structure

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support, issues, or feature requests:
- **Create an Issue**: Use the GitHub issue tracker
- **Documentation**: Refer to this README and inline code comments
- **API Documentation**: See the API endpoints section above

---

**Built with ❤️ for Agricultural Data Management**

*AgriTech Data Portal - Empowering agriculture through digital innovation*