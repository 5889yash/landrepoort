from flask import Blueprint, jsonify, request, render_template
from services.farmer_service import (
    get_all_farmers_for_render,
    get_farmers_api,
    get_farmer_by_id,
    get_farmer_for_render,
)
import json
import os

farmer_bp = Blueprint('farmer_bp', __name__)

def convert_to_acres(kanal, marle, sarsai):
    total_sarsai = (kanal * 20 * 9) + (marle * 9) + sarsai
    return total_sarsai / 1440

# Load bank data once
def load_bank_data():
    bank_data_path = os.path.join(os.path.dirname(__file__), '..', 'static', 'js', 'bankId.json')
    with open(bank_data_path, 'r') as f:
        bank_list = json.load(f)
    bank_map = {bank['BankId']: bank['BankName'] for bank in bank_list}
    return bank_map

bank_id_to_name_map = load_bank_data()

@farmer_bp.route('/farmers/all')
def all_farmers():
    try:
        farmers = get_all_farmers_for_render()
        return render_template('all_farmers.html', farmers=farmers)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@farmer_bp.route('/api/farmers')
def get_farmers():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = 10
        search = request.args.get('search', '')
        source_api = request.args.get('source_api', '')
        total_area = request.args.get('total_area', '')
        
        farmers, total_farmers, page, per_page = get_farmers_api(
            page=page, per_page=per_page, search=search, source_api=source_api, total_area=total_area
        )

        return jsonify({
            'data': farmers,
            'total': total_farmers,
            'page': page,
            'per_page': per_page,
            'total_pages': (total_farmers + per_page - 1) // per_page if per_page > 0 else 1
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@farmer_bp.route('/api/farmer/<int:farmer_id>')
def get_farmer(farmer_id):
    try:
        farmer = get_farmer_by_id(farmer_id)
        if not farmer:
            return jsonify({'error': 'Farmer not found'}), 404
        return jsonify(farmer)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@farmer_bp.route('/farmers/<int:farmer_id>/profile')
def farmer_profile(farmer_id):
    try:
        farmer = get_farmer_for_render(farmer_id)
        if not farmer:
            return "Farmer not found", 404
        return render_template('farmer_profile.html', farmer=farmer)
    except Exception as e:
        return jsonify({'error': str(e)}), 500
