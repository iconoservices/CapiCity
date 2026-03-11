function DrawMono(ctx, x, y, color, walkTime, facingLeft, name, isIT, inBoat = false) {
    const isMoving = walkTime > 0;
    const bounce = isMoving ? Math.abs(Math.sin(walkTime * 8)) * 4 : Math.sin(Date.now() * 0.003) * 2;
    const breathe = Math.sin(Date.now() * 0.002) * 1.2;
    
    ctx.save();
    ctx.translate(x + 25, y + 20);
    
    // Aura de "IT" (Rojo Agarradas)
    if (isIT) {
        const glow = Math.sin(Date.now() * 0.01) * 15 + 15;
        ctx.shadowBlur = glow; ctx.shadowColor = '#ff5555';
        ctx.strokeStyle = '#ff5555'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(0, 0, 30, 0, Math.PI * 2); ctx.stroke();
    }
    
    if (facingLeft) ctx.scale(-1, 1);

    // Sombra
    if (!inBoat) {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath(); ctx.ellipse(0, 18, 20, 6, 0, 0, Math.PI * 2); ctx.fill();
    }

    const monkeyColor = '#6d4c41'; // Marrón oscuro de mono
    const faceColor = '#ffccbc';   // Color carne/melocotón para la cara

    const legOffset = isMoving ? Math.sin(walkTime * 10) * 8 : 0;

    if (!inBoat) {
        // Brazos/Piernas largas de mono
        ctx.lineWidth = 6;
        ctx.strokeStyle = monkeyColor;
        ctx.lineCap = 'round';
        // Brazo izq
        ctx.beginPath(); ctx.moveTo(-10, 5); ctx.lineTo(-18, 15 + legOffset); ctx.stroke();
        // Brazo der
        ctx.beginPath(); ctx.moveTo(10, 5); ctx.lineTo(18, 15 - legOffset); ctx.stroke();
    }

    // Cuerpo (más erguido y pequeño que el capibara)
    ctx.fillStyle = monkeyColor;
    ctx.beginPath(); ctx.ellipse(0, 0, 18 + breathe, 22 + bounce, 0, 0, Math.PI * 2); ctx.fill();

    // Cabeza redonda
    ctx.save();
    ctx.translate(0, -25 + bounce / 2);
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fill();
    
    // Orejas grandes
    ctx.beginPath(); ctx.arc(-15, -2, 6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(15, -2, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = faceColor;
    ctx.beginPath(); ctx.arc(-15, -2, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(15, -2, 3, 0, Math.PI * 2); ctx.fill();

    // Cara (Forma de corazón/óvalo)
    ctx.fillStyle = faceColor;
    ctx.beginPath(); ctx.ellipse(0, 2, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
    
    // Ojos
    ctx.fillStyle = '#212121';
    ctx.beginPath(); ctx.arc(-4, -1, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(4, -1, 2.5, 0, Math.PI * 2); ctx.fill();
    
    // Hocico pequeño
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath(); ctx.arc(0, 5, 2, 0, Math.PI * 2); ctx.fill();

    ctx.restore();

    // Cola larga rizada
    ctx.strokeStyle = monkeyColor;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(-10, 10);
    ctx.bezierCurveTo(-30, 10, -30, -20, -15, -25);
    ctx.stroke();

    ctx.restore();
}
