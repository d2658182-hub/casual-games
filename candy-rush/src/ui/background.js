/* ============================================================
   BACKGROUND BUILDER — personalized candy backgrounds
   ------------------------------------------------------------
   Composed from downloaded Kenney elements (CC0) layered over
   a pastel CSS gradient : fully responsive, no stretching,
   no overlap on any screen size.
   ============================================================ */

const BG = {
  DEFAULT_COLORS: ['#ffe3f1', '#fff3e0', '#e6f6ff', '#eaf9f0'],

  /* Returns a <div class="bg-scene"> with gradient + layers.
     colors = [g1,g2,g3,g4] pastel stops (world theme). */
  build(kind, colors) {
    const scene = document.createElement('div');
    scene.className = `bg-scene bg-${kind}`;

    // World-themed pastel gradient (pure CSS — adapts to any aspect)
    const c = colors && colors.length === 4 ? colors : BG.DEFAULT_COLORS;
    const gradient = document.createElement('div');
    gradient.className = 'bg-gradient';
    gradient.style.background = `linear-gradient(180deg, ${c[0]} 0%, ${c[1]} 32%, ${c[2]} 66%, ${c[3]} 100%)`;
    scene.appendChild(gradient);

    // Soft floating blobs (CSS radial gradients)
    const blobA = document.createElement('div');
    blobA.className = 'bg-blob bg-blob-a';
    const blobB = document.createElement('div');
    blobB.className = 'bg-blob bg-blob-b';
    scene.appendChild(blobA);
    scene.appendChild(blobB);

    // Sun + clouds: menu-style screens only (the gameplay canvas
    // draws its own parallax clouds synced to the world speed)
    if (kind !== 'gameplay') {
      const sun = document.createElement('img');
      sun.className = 'bg-sun';
      sun.src = 'assets/bg/sun.png';
      sun.alt = '';
      sun.draggable = false;
      scene.appendChild(sun);

      const clouds = document.createElement('img');
      clouds.className = 'bg-clouds';
      clouds.src = 'assets/bg/clouds1.png';
      clouds.alt = '';
      clouds.draggable = false;
      scene.appendChild(clouds);

      const cloudA = document.createElement('img');
      cloudA.className = 'bg-cloud bg-cloud-a';
      cloudA.src = 'assets/bg/cloud3.png';
      cloudA.alt = '';
      cloudA.draggable = false;
      scene.appendChild(cloudA);

      const cloudB = document.createElement('img');
      cloudB.className = 'bg-cloud bg-cloud-b';
      cloudB.src = 'assets/bg/cloud9.png';
      cloudB.alt = '';
      cloudB.draggable = false;
      scene.appendChild(cloudB);
    }

    return scene;
  }
};
