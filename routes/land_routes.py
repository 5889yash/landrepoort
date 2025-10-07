from flask import Blueprint, jsonify, request
from services.land_service import get_lands_api, get_land_by_id, update_land

land_bp = Blueprint('land_bp', __name__)


@land_bp.route('/api/lands')
def get_lands():
    try:
        page = request.args.get('page', 1, type=int)
        per_page = 10
        search = request.args.get('search', '')
        
        lands, total_lands, page, per_page = get_lands_api(page=page, per_page=per_page, search=search)
        return jsonify({
            'data': lands,
            'total': total_lands,
            'page': page,
            'per_page': per_page,
            'total_pages': (total_lands + per_page - 1) // per_page if per_page > 0 else 1
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@land_bp.route('/api/land/<int:land_id>')
def get_land(land_id):
    try:
        land = get_land_by_id(land_id)
        if not land:
            return jsonify({'error': 'Land record not found'}), 404
        return jsonify(land)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@land_bp.route('/api/land/update/<int:land_id>', methods=['POST'])
def update_land(land_id):
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Invalid data'}), 400
        success = update_land(land_id, data)
        if success:
            return jsonify({'success': True})
        return jsonify({'error': 'Update failed'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500
