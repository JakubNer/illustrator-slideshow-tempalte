import arg from 'arg';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import Ajv from 'ajv';

const SCHEMA = {
  required: ['min', 'max', 'illustration'],
  properties: {
    min: {
      type: 'string',
      pattern: '^[0-9.]+(em|px)$'
    },
    max: {
      type: 'string',
      pattern: '^[0-9.]+(em|px)$'
    },
    illustration: {
      type: 'array',
      items: [{
        type: 'object',
        required: ['flows'],
        properties: {
          flows: {
            type: 'array',
            items: [{
              type: 'object',
              required: ['html', 'seconds', 'id'],
              properties: {
                html: {
                  type: 'string'
                },
                seconds: {
                  type: 'number'
                },
                id: {
                  type: 'string',
                  pattern: '^[-a-zA-Z0-9._]+$'
                }
              }  
            }]
          },
          subsections: {
            type: 'array',
            items: [{
              type: 'object',
              required: ['flows'],
              properties: {
                flows: {
                  type: 'array',
                  items: [{
                    type: 'object',
                    required: ['html', 'seconds', 'id'],
                    properties: {
                      html: {
                        type: 'string'
                      },
                      seconds: {
                        type: 'number'
                      },
                      id: {
                        type: 'string',
                        pattern: '^[-a-zA-Z0-9._]+$'
                      }
                    }  
                  }]
                }
              }
            }]
          }
        }
      }]
    }
  }
}

function parseArgumentsIntoOptions(rawArgs) {
  const args = arg(
    {
      '--folder': String,
      '--help': Boolean,
      '--seed': Boolean,
      '-f': '--folder',
      '-h': '--help',
      '-s': '--seed'
    },
    {
      argv: rawArgs.slice(2),
    }
  );
  return {
    showHelp: args['--help'] || false,
    doSeed: args['--seed'] || false,
    folder: args['--folder'] || './'
  };
 }

function showHelp() {
  console.log(`
    Usage: slideshow [--folder <folder>] [--seed]

        Given a folder with a *.yml file matching a certain schema (below),
        and *.svg files, generates a *.html slideshow output file in the same 
        folder, named after the *.yml file.

    Where:
      --folder <folder> specifies the folder containing files to render into 
               a slideshow.  

               A single *.yml file defining the slideshow configuration as
               per schema below.  Any number of *.svg files with file names
               matching 'id' tags in the *.yml file.

               Default to current folder if not specified.

      --seed specifies the folder should be populated with a *.yml and *.svg
               from template.

               The folder must be empty.

    YAML file:

      File to be present in the slideshow folder.

      Specifies flows.  A flow is a statement of text highlighted in the 
      right/bottom panel of the slideshow while the *.svg with filename
      matching the 'id' of the flow is displayed in the left/top panel.

      Schema:

          min: 1em                     /* minimized text font size */
          max: 2.5em                   /* maximized/expanded font size */
          illustration:
          - flows:         
            - html: ...                /* HTML text of first flow */
              seconds: 2               /* Number of seconds to animate */
              id: ...                  /* name of *.svg file to display */
            subsections:
            - flows:                  
              - html:                  /* HTML text of first sub-flow */
                seconds: 2             /* Number of seconds to animate */
                id: ...                /* name of *.svg file to display */  

    SVG files:

      Each SVG file should be 1000px x 1000px.  If you use '--seed' to
      generate *.svg, you'll have *.svg with a 1000x1000 transparent 
      rectangle which you can use as a guide, a canvas.
  `);
}

function isFolderEmpty(dirname) {
  let files = fs.readdirSync(dirname);
  return !files.length;
}

function hasOneYamlFile(dirname) {
  let files = fs.readdirSync(dirname);
  return files.map(f => path.extname(f).toLowerCase()).filter(ext => ext === '.yml').length === 1;
}

function getYamlFileName(dirname) {
  let files = fs.readdirSync(dirname);
  return dirname + path.sep + files.filter(f => path.extname(f).toLowerCase() === '.yml');
}

function getYamlAsJson(dirname) {
  const file = getYamlFileName(dirname);
  return yaml.safeLoad(fs.readFileSync(path.resolve(file), 'utf8'));
}

function ymlFileHasGoodSyntax(dirname) {
  const contents = getYamlAsJson(dirname);
  var ajv = new Ajv();
  var validate = ajv.compile(SCHEMA);
  var valid = validate(contents);
  if (!valid) {
    console.log(`'${getYamlFileName(dirname)}' failed to parse:`);
    console.log(validate.errors);
    return false;
  }
  console.log(`'${getYamlFileName(dirname)}' parsed OK...`);
  return true;
}

function getAllSvgFilesFromYml(dirname) {
  const contents = getYamlAsJson(dirname);
  if (!contents) return [];
  if (!contents.illustration) return [];
  var result = [];
  contents.illustration.forEach(i => {
    if (i.flows) {
      i.flows.forEach(f => {
        if (f.id && f.id.length > 0) {
          result.push(f.id);
        }
      });
    }
    if (i.subsections) {
      i.subsections.forEach(s => {
        if (s.flows) {
          s.flows.forEach(f => {
            if (f.id && f.id.length > 0) {
              result.push(f.id);
            }
          });
        }    
      });
    }
  });
  return result.map(r => path.resolve(dirname + path.sep + r + '.svg'));
}

function allSvgFilesFromYmlPresentInFolder(dirname) {
  const svgsInYml = getAllSvgFilesFromYml(dirname);
  var allThere = true;
  svgsInYml.forEach(s => {
    if (!fs.existsSync(s)) {
      allThere = false;
      console.log(`SVG file referenced but not found: ${s}`);
    }    
  });
  return allThere;
}

function doSeed() {

}

export function main(args) {
  let options = {};
  try {
    options = parseArgumentsIntoOptions(args);
  } catch (e) {
    options['showHelp'] = true;
  }
  if (options.showHelp) {
    showHelp();
    process.exit();
  }

  console.log(`Working with folder '${path.resolve(options.folder)}'...`);
  
  if (!fs.existsSync(options.folder)) {
    console.log(`Folder '${options.folder}' doesn't exist, exiting.`);
    process.exit();
  }

  if (options.doSeed) {
    if (!isFolderEmpty(options.folder)) {
      console.log(`Folder '${options.folder}' should be empty before seeding.`);
    } else {
      doSeed();
    }
    process.exit();
  }

  if (!hasOneYamlFile(options.folder)) {
    console.log(`Folder '${options.folder}' must have a single yaml file.`);
    process.exit();
  }

  if (!ymlFileHasGoodSyntax(options.folder)) {
    console.log(`'${options.folder}/${path.basename(getYamlFileName(options.folder))}' must have proper syntax.`);
    process.exit();
  }

  if (!allSvgFilesFromYmlPresentInFolder(options.folder)) {
    console.log(`Not all SVG files referenced in '${options.folder}/${path.basename(getYamlFileName(options.folder))}' are present in '${options.folder}' folder.`);
    process.exit();    
  }
}