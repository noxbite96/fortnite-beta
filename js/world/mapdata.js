// ============================================================
//  Données de la carte : lieux nommés, rivière, lac, routes
// ============================================================
(function () {
  const M = {
    W: 800,             // demi-taille du monde (la carte fait 1600 m)
    ISLAND_R: 500,      // rayon moyen de l'île
    SEED: 20260930,
    mountain: { x: 310, z: -310, r: 195, h: 128 },
    castleHill: { x: -300, z: -260, r: 115, h: 30 },
    lake: { x: -200, z: 60, r: 72, island: { x: -205, z: 62, r: 17 } },
    spawnIsland: { x: 0, z: 705, r: 58 },
    river: [[190, -150], [168, -85], [152, -15], [125, 55], [78, 112], [12, 138], [-68, 120], [-140, 88], [-190, 66]],
    riverOut: [[-215, 70], [-262, 112], [-305, 150], [-362, 178], [-432, 198], [-520, 214], [-640, 226]],
    riverHalfWidth: 8,
    pois: [
      { id: 'tours', name: 'Tours Penchées', x: 20, z: -40, r: 88 },
      { id: 'parc', name: 'Parc Paisible', x: -40, z: -300, r: 78 },
      { id: 'usine', name: 'Usine Rouillée', x: 330, z: 40, r: 80 },
      { id: 'ferme', name: 'Ferme Fatale', x: 80, z: 300, r: 85 },
      { id: 'chateau', name: 'Château Royal', x: -300, z: -260, r: 58 },
      { id: 'sources', name: 'Sources Salées', x: -300, z: 300, r: 58 },
      { id: 'plage', name: 'Plage Paradis', x: -470, z: -60, r: 55 },
      { id: 'lac', name: 'Lac Butin', x: -200, z: 60, r: 75, noFlatten: true },
      { id: 'galerie', name: 'Galerie Marchande', x: 300, z: 245, r: 66 },
      { id: 'chalet', name: 'Chalet du Pic', x: 232, z: -232, r: 42 },
      { id: 'docks', name: 'Docks Délabrés', x: 110, z: -446, r: 52, noFlatten: true },
      { id: 'base', name: 'Base Militaire', x: -140, z: 320, r: 48 },
    ],
    // petits repères non nommés (sur la grande carte en plus petit)
    landmarks: [
      { id: 'phare', name: 'Phare', x: 455, z: -95, r: 14 },
      { id: 'station', name: 'Station-service', x: 180, z: 150, r: 22 },
      { id: 'camp', name: 'Camp forestier', x: -150, z: -150, r: 20 },
      { id: 'epave', name: 'Épave', x: -60, z: 420, r: 22 },
      { id: 'radio', name: 'Antenne', x: 120, z: -200, r: 14 },
      { id: 'moulin', name: 'Moulin', x: -410, z: 120, r: 16 },
    ],
    roads: [
      { w: 7, pts: [[20, -40], [-5, -130], [-25, -220], [-40, -300]] },
      { w: 7, pts: [[20, -40], [110, -30], [210, 0], [330, 40]] },
      { w: 7, pts: [[20, -40], [45, 60], [70, 150], [85, 230], [80, 300]] },
      { w: 6, pts: [[20, -40], [-60, 0], [-130, 20], [-200, 60]] },
      { w: 6, pts: [[-200, 60], [-240, 150], [-275, 230], [-300, 300]] },
      { w: 6, pts: [[-40, -300], [-140, -300], [-230, -285], [-300, -260]] },
      { w: 6, pts: [[80, 300], [170, 290], [240, 265], [300, 245]] },
      { w: 6, pts: [[330, 40], [330, 130], [310, 200], [300, 245]] },
      { w: 5, pts: [[330, 40], [290, -60], [250, -160], [232, -232]] },
      { w: 5, pts: [[-200, 60], [-300, 30], [-390, -20], [-452, -60]] },
      { w: 5, pts: [[70, 150], [180, 150], [250, 150]] },
    ],
  };
  G.MapData = M;

  M.allPlaces = () => M.pois.concat(M.landmarks);
  M.poiById = (id) => M.pois.find((p) => p.id === id) || M.landmarks.find((p) => p.id === id);
  M.nearestPoiName = (x, z) => {
    let best = null, bd = 1e9;
    for (const p of M.pois) { const d = Math.hypot(p.x - x, p.z - z) - p.r; if (d < bd) { bd = d; best = p; } }
    return bd < 40 ? best.name : null;
  };
})();
