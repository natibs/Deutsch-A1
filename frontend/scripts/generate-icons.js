// One-off script to rasterize public/logo.svg into the source images
// @capacitor/assets needs (resources/icon.png, icon-foreground.png,
// icon-background.png, splash.png). Run with: node scripts/generate-icons.js
const path = require('node:path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const svgPath = path.join(root, 'public', 'logo.svg');
const outDir = path.join(root, 'resources');

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };

async function main() {
  // Legacy/general icon: logo on a white square, small margin.
  const iconLogo = await sharp(svgPath).resize(900, 900).png().toBuffer();
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: WHITE } })
    .composite([{ input: iconLogo, gravity: 'center' }])
    .png()
    .toFile(path.join(outDir, 'icon.png'));

  // Adaptive icon foreground: transparent bg, logo scaled to the safe zone
  // (roughly the center 2/3) so it isn't clipped when the OS masks the shape.
  const fgLogo = await sharp(svgPath).resize(660, 660).png().toBuffer();
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: fgLogo, gravity: 'center' }])
    .png()
    .toFile(path.join(outDir, 'icon-foreground.png'));

  // Adaptive icon background: flat white.
  await sharp({ create: { width: 1024, height: 1024, channels: 4, background: WHITE } })
    .png()
    .toFile(path.join(outDir, 'icon-background.png'));

  // Splash screen: logo centered on a large white canvas.
  const splashLogo = await sharp(svgPath).resize(420, 420).png().toBuffer();
  await sharp({ create: { width: 2732, height: 2732, channels: 4, background: WHITE } })
    .composite([{ input: splashLogo, gravity: 'center' }])
    .png()
    .toFile(path.join(outDir, 'splash.png'));

  console.log('Wrote icon.png, icon-foreground.png, icon-background.png, splash.png to', outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
