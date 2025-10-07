from flask import Blueprint, jsonify
from models.database import engine
from sqlalchemy import text, inspect

stats_bp = Blueprint('stats_bp', __name__)

@stats_bp.route('/api/stats')
def get_stats():
    try:
        with engine.connect() as conn:
            # Get total farmers
            farmers_count = conn.execute(text("SELECT COUNT(*) FROM farmers")).scalar() or 0
            
            # Get total land records
            total_lands = conn.execute(text("SELECT COUNT(*) FROM land_records")).scalar() or 0
            
            # Try to get total area if the column exists
            total_area = 0
            try:
                # Check if area column exists in land_records
                inspector = inspect(engine)
                columns = [col['name'] for col in inspector.get_columns('land_records')]
                if 'owner_area' in columns:
                    area_result = conn.execute(
                        text("SELECT COALESCE(SUM(CAST(owner_area AS FLOAT)), 0) FROM land_records")
                    ).scalar()
                    total_area = float(area_result) if area_result else 0
            except Exception:
                # app.logger.warning(f"Could not calculate total area: {str(e)}")
                pass
        
        return jsonify({
            'total_farmers': farmers_count,
            'total_lands': total_lands,
            'total_area': total_area
        })
        
    except Exception as e:
        # app.logger.error(f"Error in get_stats: {str(e)}")
        return jsonify({'error': str(e)}), 500