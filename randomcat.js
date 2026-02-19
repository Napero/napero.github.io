const catGifs = [
    "https://www.nyan.cat/cats/404.gif",
    "https://www.nyan.cat/cats/america.gif",
    "https://www.nyan.cat/cats/balloon.gif",
    "https://www.nyan.cat/cats/bday.gif",
    "https://www.nyan.cat/cats/daft.gif",
    "https://www.nyan.cat/cats/dub.gif",
    "https://www.nyan.cat/cats/easter.gif",
    "https://www.nyan.cat/cats/elevator.gif",
    "https://www.nyan.cat/cats/fat.gif",
    "https://www.nyan.cat/cats/fiesta.gif",
    "https://www.nyan.cat/cats/floppy.gif",
    "https://www.nyan.cat/cats/gb.gif",
    "https://www.nyan.cat/cats/grumpy.gif",
    "https://www.nyan.cat/cats/j5.gif",
    "https://www.nyan.cat/cats/jazz.gif",
    "https://www.nyan.cat/cats/manyan.gif",
    "https://www.nyan.cat/cats/melon.gif",
    "https://www.nyan.cat/cats/mexinyan.gif",
    "https://www.nyan.cat/cats/mummy.gif",
    "https://www.nyan.cat/cats/newyear.gif",
    "https://www.nyan.cat/cats/nyancoin.gif",
    "https://www.nyan.cat/cats/nyandoge.gif",
    "https://www.nyan.cat/cats/nyaninja.gif",
    "https://www.nyan.cat/cats/oldnewyear.gif",
    "https://www.nyan.cat/cats/original.gif",
    "https://www.nyan.cat/cats/paddy.gif",
    "https://www.nyan.cat/cats/pikanyan.gif",
    "https://www.nyan.cat/cats/pirate.gif",
    "https://www.nyan.cat/cats/pumpkin.gif",
    "https://www.nyan.cat/cats/rasta.gif",
    "https://www.nyan.cat/cats/retro.gif",
    "https://www.nyan.cat/cats/sad.gif",
    "https://www.nyan.cat/cats/skrillex.gif",
    "https://www.nyan.cat/cats/slomo.gif",
    "https://www.nyan.cat/cats/smurfcat.gif",
    "https://www.nyan.cat/cats/star.gif",
    "https://www.nyan.cat/cats/tacnayn.gif",
    "https://www.nyan.cat/cats/tacodog.gif",
    "https://www.nyan.cat/cats/technyancolor.gif",
    "https://www.nyan.cat/cats/toaster.gif",
    "https://www.nyan.cat/cats/vday.gif",
    "https://www.nyan.cat/cats/watermelon.gif",
    "https://www.nyan.cat/cats/wtf.gif",
    "https://www.nyan.cat/cats/xmas.gif",
    "https://www.nyan.cat/cats/zombie.gif"
];

function getRandomCatGif() {
    const randomIndex = Math.floor(Math.random() * catGifs.length);
    return catGifs[randomIndex];
}

function getRandomBetween(min, max) {
    return Math.random() * (max - min) + min;
}

function spawnRandomNyanCat() {
    const catImg = document.createElement("img");
    const size = Math.round(getRandomBetween(90, 220));
    const duration = getRandomBetween(2.5, 7);
    const startY = getRandomBetween(10, 85);
    const endY = Math.min(90, Math.max(5, startY + getRandomBetween(-20, 20)));

    catImg.className = "nyan-cat-instance";
    catImg.src = getRandomCatGif();
    catImg.alt = "Nyan Cat";
    catImg.style.width = `${size}px`;
    catImg.style.setProperty("--nyan-size", `${size}px`);
    catImg.style.setProperty("--nyan-start-y", `${startY}%`);
    catImg.style.setProperty("--nyan-end-y", `${endY}%`);
    catImg.style.animationDuration = `${duration.toFixed(2)}s`;

    document.body.appendChild(catImg);

    const cleanup = () => catImg.remove();
    catImg.addEventListener("animationend", cleanup, { once: true });
    catImg.addEventListener("error", cleanup, { once: true });
}

window.getRandomCatGif = getRandomCatGif;
window.spawnRandomNyanCat = spawnRandomNyanCat;
