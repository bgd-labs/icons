import fs from "fs";
import path from "path";
import { z } from "zod";
import { optimize } from "svgo";
import { generateAToken, generateStataToken } from "../utils";

const ICONS_FOLDER = "src/assets/icons";
const OUTPUT_FOLDER = "icons";
const MONO_SUFFIX = "_mono";
const FULL_SUFFIX = "_full";

const IconMetaSchema = z.object({
  name: z.string(),
  symbol: z.string(),
  symbolAliases: z.array(z.string()),
  variations: z.array(z.string()),
});

interface WriteQueueItem {
  filePath: string;
  content: string;
}

// ----------------------------------------
// Helper functions
// ----------------------------------------
const getPrefix = (fileName: string) => fileName.split(/[_\.]/)[0];

const readJsonFile = (filePath: string) => {
  const content = fs.readFileSync(filePath, { encoding: "utf8" });
  const jsonData = JSON.parse(content);

  const parsedData = IconMetaSchema.safeParse(jsonData);
  if (!parsedData.success) {
    throw new Error(`Invalid JSON structure in ${filePath}.`);
  }

  return parsedData.data;
};

const processIconFile = (filePath: string) => {
  let svgContent = fs.readFileSync(filePath, { encoding: "utf8" });

  return {
    replaceColorWithCurrent: function () {
      svgContent = svgContent.replace(/#[0-9a-fA-F]{6}/g, "currentColor");
      return this;
    },
    optimizeSVGContent: function () {
      const optimizationResult = optimize(svgContent);
      svgContent = optimizationResult.data;
      return this;
    },
    getSVGContent: function () {
      return svgContent;
    },
  };
};

// ----------------------------------------

const files = fs
  .readdirSync(ICONS_FOLDER)
  .filter((file) => file.endsWith(".svg") || file.endsWith(".json"));

const groupedFiles = {};
const uniquePrefixes = new Set(files.map(getPrefix));

uniquePrefixes.forEach((prefix) => {
  const jsonFilePath = path.join(ICONS_FOLDER, `${prefix}.json`);

  if (!fs.existsSync(jsonFilePath)) {
    console.error(
      `🟡 Warn: The metadata file ${prefix}.json is missing. Please ensure the file exists to generate icons correctly.`
    );
    return;
  }

  const metaData = readJsonFile(jsonFilePath);

  const prefixFiles = files.filter((file) => getPrefix(file) === prefix);
  const mono = prefixFiles.find((file) => file.includes(MONO_SUFFIX)) || null;
  const full = prefixFiles.find((file) => file.includes(FULL_SUFFIX)) || null;

  groupedFiles[prefix] = { meta: metaData, mono, full };
});

const iconsArray = Object.keys(groupedFiles).map((key) => ({
  ...groupedFiles[key],
}));

// TODO: add types
const iconsInfoFile: any[] = [];

for (const icon of iconsArray) {
  const { meta, mono, full } = icon;
  const { name, variations } = meta;

  const iconInfo = {
    ...meta,
    icons: {},
  };

  if (!mono || !full) {
    console.error(
      `🟡 Warn: The icon ${name} is missing either mono or full version and was not added.`
    );
    continue;
  }

  const writeQueue: WriteQueueItem[] = [];

  const monoContent = processIconFile(path.join(ICONS_FOLDER, mono))
    .replaceColorWithCurrent()
    .optimizeSVGContent()
    .getSVGContent();

  const monoFilePath = path.join(
    OUTPUT_FOLDER,
    "mono",
    `${meta.symbol.toLowerCase()}.svg`
  );
  iconInfo.icons.mono = monoFilePath;

  writeQueue.push({
    filePath: monoFilePath,
    content: monoContent,
  });

  const fullContent = processIconFile(path.join(ICONS_FOLDER, full))
    .optimizeSVGContent()
    .getSVGContent();

  const fullFilePath = path.join(
    OUTPUT_FOLDER,
    "full",
    `${meta.symbol.toLowerCase()}.svg`
  );
  iconInfo.icons.full = fullFilePath;

  writeQueue.push({
    filePath: fullFilePath,
    content: fullContent,
  });

  if (variations.includes("aToken")) {
    const aTokenMono = generateAToken(monoContent, "mono");
    const aTokenFull = generateAToken(fullContent, "full");

    const aTokenMonoFilePath = path.join(
      OUTPUT_FOLDER,
      "mono",
      `a${meta.symbol.toLowerCase()}.svg`
    );
    const aTokenFullFilePath = path.join(
      OUTPUT_FOLDER,
      "full",
      `a${meta.symbol.toLowerCase()}.svg`
    );
    iconInfo.icons.aToken = {
      mono: aTokenMonoFilePath,
      full: aTokenFullFilePath,
    };

    writeQueue.push(
      {
        filePath: aTokenMonoFilePath,
        content: aTokenMono,
      },
      {
        filePath: aTokenFullFilePath,
        content: aTokenFull,
      }
    );
  }

  if (variations.includes("stataToken")) {
    const stataTokenMono = generateStataToken(monoContent, "mono");
    const stataTokenFull = generateStataToken(fullContent, "full");

    const stataTokenMonoFilePath = path.join(
      OUTPUT_FOLDER,
      "mono",
      `stata${meta.symbol.toLowerCase()}.svg`
    );
    const stataTokenFullFilePath = path.join(
      OUTPUT_FOLDER,
      "full",
      `stata${meta.symbol.toLowerCase()}.svg`
    );

    iconInfo.icons.stataToken = {
      mono: stataTokenMonoFilePath,
      full: stataTokenFullFilePath,
    };

    writeQueue.push(
      {
        filePath: stataTokenMonoFilePath,
        content: stataTokenMono,
      },
      {
        filePath: stataTokenFullFilePath,
        content: stataTokenFull,
      }
    );
  }

  writeQueue.forEach((item) => {
    const dir = path.dirname(item.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(item.filePath, item.content);
  });
  iconsInfoFile.push(iconInfo);
  console.log(`✅ Icon ${name} (${meta.symbol}) processed.`);
}


const iconsJsonPath = path.join(OUTPUT_FOLDER, 'icons.json');
const iconsJsonContent = JSON.stringify(iconsInfoFile, null, 2);
fs.writeFileSync(iconsJsonPath, iconsJsonContent);
console.log(`📋 Icons metadata file generated at ${iconsJsonPath}.`);