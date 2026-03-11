function DrawCapibara(ctx, x, y, color, walkTime, facingLeft, name, isIT, inBoat = false) {
    const isMoving = walkTime > 0;
    const bounce = isMoving ? Math.abs(Math.sin(walkTime * 8)) * 3 : Math.sin(Date.now() * 0.003) * 1.5;
    const breathe = Math.sin(Date.now() * 0.002) * 1.5;
    ctx.save();
    ctx.translate(x + 25, y + 20);
    if (isIT) {
        const glow = Math.sin(Date.now() * 0.01) * 15 + 15;
        ctx.shadowBlur = glow; ctx.shadowColor = '#ff5555';
        ctx.strokeStyle = '#ff5555'; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.ellipse(0, 0, 35, 25, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (facingLeft) ctx.scale(-1, 1);

    if (!inBoat) {
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        ctx.beginPath(); ctx.ellipse(0, 18, 25, 8, 0, 0, Math.PI * 2); ctx.fill();
    }
    const bodyColor = '#9e7647'; ctx.fillStyle = bodyColor;
    const legOffset = isMoving ? Math.sin(walkTime * 10) * 5 : 0;

    if (!inBoat) {
        // Patas con pesuñitas
        const toeColor = '#795548';
        // Pata izquierda
        ctx.save();
        ctx.translate(-15, 12 + legOffset);
        ctx.fillStyle = bodyColor;
        ctx.beginPath(); ctx.ellipse(0, 0, 6, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = toeColor;
        ctx.beginPath(); ctx.arc(-3, 8, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(3, 8, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
        // Pata derecha
        ctx.save();
        ctx.translate(15, 12 - legOffset);
        ctx.fillStyle = bodyColor;
        ctx.beginPath(); ctx.ellipse(0, 0, 6, 10, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = toeColor;
        ctx.beginPath(); ctx.arc(-3, 8, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(3, 8, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }

    ctx.fillStyle = bodyColor;
    ctx.beginPath(); ctx.ellipse(0, 0, 32 + breathe, 24 + bounce, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.translate(24, -14 + bounce / 2); ctx.rotate(-0.1);
    ctx.beginPath(); ctx.ellipse(0, 0, 18, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#212121'; ctx.beginPath(); ctx.arc(7, -5, 2.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'white'; ctx.beginPath(); ctx.arc(8, -6.5, 1, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#795548'; ctx.globalAlpha = 0.3;
    ctx.beginPath(); ctx.ellipse(12, 3, 8, 6, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1.0;
    ctx.fillStyle = '#3e2723'; ctx.beginPath(); ctx.arc(16, 1, 2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = bodyColor; ctx.beginPath(); ctx.ellipse(-2, -14, 6, 8, -0.4, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.restore();
}
