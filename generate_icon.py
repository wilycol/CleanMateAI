from PIL import Image, ImageDraw, ImageFilter

def create_logo_ico(size=(256, 256)):
    # Create a new image with transparent background
    img = Image.new('RGBA', size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Dimensions
    w, h = size
    center_x, center_y = w // 2, h // 2
    
    # 1. Shield Shape (Simplified)
    # Coordinates for a shield-like shape
    shield_points = [
        (center_x, 0),          # Top center
        (w, h * 0.25),          # Top right
        (w, h * 0.75),          # Bottom right curve start
        (center_x, h),          # Bottom tip
        (0, h * 0.75),          # Bottom left curve start
        (0, h * 0.25)           # Top left
    ]
    
    # Draw Shield Background (Blue Gradient simulation - solid for ICO simplicity)
    draw.polygon(shield_points, fill="#1e40af") # Dark Blue
    
    # 2. Hexagon (Tech/AI symbol)
    hex_size = w * 0.3
    import math
    hex_points = []
    for i in range(6):
        angle_deg = 60 * i - 30
        angle_rad = math.radians(angle_deg)
        x = center_x + hex_size * math.cos(angle_rad)
        y = center_y + hex_size * math.sin(angle_rad)
        hex_points.append((x, y))
    
    draw.polygon(hex_points, outline="#60a5fa", width=int(w*0.05)) # Light Blue outline
    
    # 3. Central Node (Brain/Core)
    r = w * 0.1
    draw.ellipse((center_x - r, center_y - r, center_x + r, center_y + r), fill="#ffffff")
    
    # Save as ICO
    # We save multiple sizes for best Windows compatibility
    img.save('web/assets/logo.ico', format='ICO', sizes=[(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)])
    print("Icono generado en web/assets/logo.ico")

if __name__ == "__main__":
    create_logo_ico()