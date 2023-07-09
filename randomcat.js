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
  
document.addEventListener("DOMContentLoaded", function() {
    const catImg = document.getElementById("catGif");
    catImg.src = getRandomCatGif();
});
  