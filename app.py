from flask import Flask, render_template

def create_app(config=None):
    """
    Application factory. Pass an optional config dict to override defaults.
    """
    app = Flask(__name__)
    if config:
        app.config.update(config)

    # Import and register blueprints here to avoid circular imports at module import time
    from routes.farmer_routes import farmer_bp
    from routes.land_routes import land_bp
    from routes.stats_routes import stats_bp

    app.register_blueprint(farmer_bp)
    app.register_blueprint(land_bp)
    app.register_blueprint(stats_bp)

    @app.route('/')
    def index():
        return render_template('index.html')

    return app

if __name__ == '__main__':
    app = create_app({'DEBUG': True})
    app.run(debug=app.config.get('DEBUG', True), port=5000)
