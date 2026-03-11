function DrawDelfin(ctx, x, y, color, walkTime, facingLeft, name, isIT, inWater = false) {
    const isMoving = walkTime > 0;
    const bounce = isMoving ? Math.abs(Math.sin(walkTime * 8)) * 4 : Math.sin(Date.now() * 0.003) * 2;
    const breathe = Math.sin(Date.now() * 0.002) * 1.5;
    
    ctx.save();
    ctx.translate(x + 25, y + 20);
    
    // Aura de "La trae"
    if (isIT) {
        const glow = Math.sin(Date.now() * 0.01) * 15 + 15;
        ctx.shadowBlur = glow; ctx.shadowColor = '#ff5555';
        ctx.strokeStyle = '#ff5555'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, 0, 35, 20, 0, 0, Math.PI * 2); ctx.stroke();
    }
    
    if (facingLeft) ctx.scale(-1, 1);

    // Sombra
    ctx.fillStyle = 'rgba(0,0,0,0.1)';
    ctx.beginPath(); ctx.ellipse(0, 15, 25, 8, 0, 0, Math.PI * 2); ctx.fill();

    const pinkColor = '#ff80ab'; 
    const darkPink = '#f06292';

    // Cuerpo (Forma de torpedo)
    ctx.fillStyle = pinkColor;
    ctx.beginPath();
    ctx.ellipse(0, bounce, 30 + breathe, 18 + bounce/2, 0, 0, Math.PI * 2);
    ctx.fill();

    // Hocico largo
    ctx.beginPath();
    ctx.ellipse(25, 5 + bounce, 15, 6, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Aleta dorsal
    ctx.beginPath();
    ctx.moveTo(-5, -15 + bounce);
    ctx.quadraticCurveTo(-15, -25 + bounce, -25, -10 + bounce);
    ctx.fill();

    // Aleta lateral
    ctx.fillStyle = darkPink;
    ctx.beginPath();
    ctx.ellipse(5, 8 + bounce, 12, 5, 0.5, 0, Math.PI * 2);
    ctx.fill();

    // Ojo tierno
    ctx.fillStyle = '#212121';
    const isBlinking = (Math.sin(Date.now() * 0.005) > 0.98);
    if (!isBlinking) {
        ctx.beginPath(); ctx.arc(15, -2 + bounce, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(16, -3 + bounce, 1, 0, Math.PI * 2); ctx.fill();
    } else {
        ctx.fillRect(12, -3 + bounce, 5, 2);
    }

    ctx.restore();
}
