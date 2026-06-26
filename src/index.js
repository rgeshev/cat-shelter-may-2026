import http from "http";
import fs from "fs/promises";
import cats from "./cats.js";
import { addCat, readCats, getCatById, editCat, deleteCat } from "./catService.js";
import { addBreed, readBreeds, getBreedByName } from "./breedService.js";

const server = http.createServer(async (req, res) => {
  if (req.method === "POST" && req.url === "/cats/add-breed") {
    const bodyFormData = await readBodyFormData(req);

    const breedName = bodyFormData.get("breed");

    addBreed(breedName);

    return res.writeHead(302, { Location: "/" }).end();
  }

  if (req.method === "POST" && req.url === "/cats/add-cat") {
    const bodyFormData = await readBodyFormData(req);

    const newCat = {
      name: bodyFormData.get("name"),
      description: bodyFormData.get("description"),
      image: bodyFormData.get("imageUrl"),
      breed: bodyFormData.get("breed"),
    };

    addCat(newCat);

    return res.writeHead(302, { Location: "/" }).end();
  }

  if (req.method === "POST" && req.url.startsWith("/cats/edit-cat")) {
    const catId = req.url.split("/").pop();
    const editedCat = await readBodyFormData(req);

    editCat(catId, {
      name: editedCat.get("name"),
      description: editedCat.get("description"),
      image: editedCat.get("imageUrl"),
      breed: editedCat.get("breed"),
    });

    return res.writeHead(302, { Location: "/" }).end();
  }

  if (req.method === "POST" && req.url.startsWith("/cats/new-home")) {
    const catId = req.url.split("/").pop();

    deleteCat(catId);

    return res.writeHead(302, { Location: "/" }).end();
  }

  if (req.url === "/styles/site.css") {
    const cssContent = await fs.readFile("./src/styles/site.css", "utf-8");

    res.writeHead(200, { "Content-Type": "text/css" });
    res.write(cssContent);

    return res.end();
  }

  if (req.url === "/js/script.js") {
    const jsContent = await fs.readFile("./src/js/script.js", "utf-8");

    res.writeHead(200, { "Content-Type": "text/javascript" });
    res.write(jsContent);
    return res.end();
  }

  let htmlContent = "";
  res.writeHead(200, { "Content-Type": "text/html" });

  if (req.url === "/") {
    htmlContent = await renderHomePage();
  } else if(req.url.startsWith("/search")) {
    const urlParams = new URLSearchParams(req.url.split("?")[1]);
    const name = urlParams.get("name");

    htmlContent = await renderHomePage({ name });
  } else if (req.url === "/cats/add-breed") {
    htmlContent = await fs.readFile("./src/views/addBreed.html", "utf-8");
  } else if (req.url === "/cats/add-cat") {
    htmlContent = await renderAddCatPage();
  } else if (req.url.startsWith("/cats/edit-cat")) {
    const catid = req.url.split("/").pop();
    htmlContent = await renderEditCatPage(catid);
  } else if (req.url.startsWith("/cats/new-home")) {
    const catId = req.url.split("/").pop();

    htmlContent = await renderNewHomePage(catId);
  } else {
    htmlContent = await renderNotFoundPage();
  }

  res.write(htmlContent);
  res.end();
});

server.listen(5000, () =>
  console.log("Server is listening on http://localhost:5000..."),
);

async function renderHomePage(filter = {}) {
  let htmlContent = await fs.readFile("./src/views/home/index.html", "utf-8");

  const catTemplate = (cat) => `
    <li>
        <img src="${cat.image}" alt="${cat.name}">
        <h3>${cat.name}</h3>
        <p><span>Breed: </span>${cat.breed}</p>
        <p><span>Description: </span>${cat.description}</p>
            <ul class="buttons">
                <li class="btn edit"><a href="/cats/edit-cat/${cat.id}">Change Info</a></li>
                <li class="btn delete"><a href="/cats/new-home/${cat.id}">New Home</a></li>
            </ul>
    </li>
    `;

    let cat = readCats(filter);
  
  const catsContent = `<ul>${readCats()
    .map((cat) => catTemplate(cat))
    .join("\n")}</ul>`;

  const result = htmlContent.replace("{{cats}}", catsContent);

  return result;
}

async function renderAddCatPage() {
  const htmlContent = await fs.readFile("./src/views/addCat.html", "utf-8");

  const result = htmlContent.replace("{{breedOptions}}", renderBreedOptions());

  return result;
}

async function renderEditCatPage(catId) {
  const cat = getCatById(catId);

  if (!cat) {
    return renderNotFoundPage();
  }

  const htmlContent = await fs.readFile("./src/views/editCat.html", "utf-8");

  const result = htmlContent
    .replace("{{name}}", cat.name)
    .replace("{{description}}", cat.description)
    .replace("{{imageUrl}}", cat.image)
    .replace("{{breedOptions}}", renderBreedOptions(cat.breed));

  return result;
}

async function renderNewHomePage(catId) {
  const cat = getCatById(catId);

  if (!cat) {
    return renderNotFoundPage();
  }

  const breed = getBreedByName(cat.breed);
  const htmlContent = await fs.readFile("./src/views/catShelter.html", "utf-8");

  const result = htmlContent
    .replaceAll("{{name}}", cat.name)
    .replace("{{description}}", cat.description)
    .replace("{{imageUrl}}", cat.image)
    .replace("{{breedId}}", breed?.id || "")
    .replace("{{breedName}}", breed?.name || cat.breed);

  return result;
}

function renderBreedOptions(selectedBreed) {
  const breeds = readBreeds();
  return breeds
    .map(
      (breed) =>
        `<option value="${breed.id}"${breed.name === selectedBreed ? " selected" : ""}>${breed.name}</option>`,
    )
    .join("\n");
}

async function renderNotFoundPage() {
  return fs.readFile("./src/views/notFound.html", "utf-8");
}

function readBodyFormData(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", () => {
      const formData = new URLSearchParams(body);

      resolve(formData);
    });
  });
}
