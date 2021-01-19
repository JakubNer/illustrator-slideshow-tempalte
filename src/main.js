import arg from 'arg';
import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import Ajv from 'ajv';

const SCHEMA = {
  required: ['min', 'max', 'sections'],
  properties: {
    min: {
      type: 'string',
      pattern: '^[0-9.]+(em|px|vmax)$'
    },
    max: {
      type: 'string',
      pattern: '^[0-9.]+(em|px|vmax)$'
    },
    svgPaneBackgroundColor: {
      type: 'string',
      pattern: '#[a-fA-F0-9]+'
    },
    textPaneBackgroundColor: {
      type: 'string',
      pattern: '#[a-fA-F0-9]+'
    },
    topBorder: {
      type: 'string',
      pattern: '[a-f]+ [0-9]+px'
    },
    bottomBorder: {
      type: 'string',
      pattern: '[a-f]+ [0-9]+px'
    },
    rightBorder: {
      type: 'string',
      pattern: '[a-f]+ [0-9]+px'
    },
    leftBorder: {
      type: 'string',
      pattern: '[a-f]+ [0-9]+px'
    },
    flipPanes: {
      type: 'boolean'
    },
    landscapeOnly: {
      type: 'boolean'
    },
    sections: {
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
                },
                centered: {
                  type: 'boolean'
                },
                focus: {
                  type: 'string',
                  pattern: '^[0-9.]+,[0-9.]+,[0-9.]+,[0-9.]+(;[0-9.]+,[0-9.]+,[0-9.]+,[0-9.]+)* [0-9.]+ [0-9.]+$'
                },
                highlight: {
                  type: 'string',
                  pattern: '^[0-9.]+,[0-9.]+,[0-9.]+,[0-9.]+(;[0-9.]+,[0-9.]+,[0-9.]+,[0-9.]+)* #[a-fA-F0-9]+ [0-9.]+ [0-9.]+(;[0-9.]+)* [0-9.]+ [0-9.]+$'
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
                      },
                      centered: {
                        type: 'boolean'
                      },
                      focus: {
                        type: 'string',
                        pattern: '^[0-9.]+,[0-9.]+,[0-9.]+,[0-9.]+(;[0-9.]+,[0-9.]+,[0-9.]+,[0-9.]+)* [0-9.]+ [0-9.]+$'
                      },
                      highlight: {
                        type: 'string',
                        pattern: '^[0-9.]+,[0-9.]+,[0-9.]+,[0-9.]+(;[0-9.]+,[0-9.]+,[0-9.]+,[0-9.]+)* #[a-fA-F0-9]+ [0-9.]+ [0-9.]+(;[0-9.]+)* [0-9.]+ [0-9.]+$'
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

      # Schema:
      #
      #     min: 1em                     /* minimized text font size (in em, px, vmax) */
      #     max: 2.5em                   /* maximized/expanded font size (in em, px, vmax) */
      #     svgPaneBackgroundColor: "#EEFFFF"
      #     textPaneBackgroundColor: "#FFEEFF"
      #     topBorder: solid 1px
      #     bottomBorder: solid 1px
      #     leftBorder: solid 0px
      #     rightBorder: solid 0px
      #     flipPanes: false
      #     landscapeOnly: true
      #     sections:                    /* array of sections, can have flows and subsections */
      #     - flows:                     /* array of flows */
      #       - html: "foo <em>bar</em>" /* HTML text of first flow */
      #         seconds: 2               /* Number of seconds to animate (0 to skip/heading) */
      #         id: "some"               /* name of *.svg file ('some') to display */
      #         centered: true           /* whether contents is centered */
      #         focus: "0,0,1000,1000;475,50,300,300;475,50,300,300;475,50,300,300;0,0,1000,1000 .75 4.25"
      #                                  /* viewport definition + animation:
      #                                   * - list of animation keyframes as viewport coordinates x,y,w,h
      #                                   * - time to start viewport animation
      #                                   * - time to end viewport animation
      #         highlight: "115,415,300,300 #921930 2 0;.4 .5 2"
      #                                  /* definition of highlights:
      #                                   * - list of highlight areas: x,y,w,h
      #                                   * - highlight color
      #                                   * - highlight line thickness
      #                                   * - list of opacity keyframes
      #                                   * - time to start opacity animation
      #                                   * - time to end opacity animation
      #       subsections:               /* array of subsections under section (side to side gallery) */
      #       - flows:                   /* array of flows */
      #         - html: "blah"           /* HTML text of first sub-flow */
      #           seconds: 2             /* Number of seconds to animate */
      #           id: "other"            /* name of *.svg file ('other') to display */
          
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
  const contents = yaml.safeLoad(fs.readFileSync(path.resolve(file), 'utf8'));
  return contents;
}

function fixIds(contents) {
  var qualifier = 1;
  contents.sections.forEach(i => {
    if (i.flows) {
      i.flows.forEach(f => {
        f.id = f.id + `__${qualifier++}`;
      });
    }
    if (i.subsections) {
      i.subsections.forEach(s => {
        if (s.flows) {
          s.flows.forEach(f => {
            f.id = f.id + `__${qualifier++}`;
          });
        }    
      });
    }
  });
  return contents;
}

function adjustForCentered(contents) {
  var qualifier = 1;
  contents.sections.forEach(i => {
    if (i.flows) {
      i.flows.forEach(f => {
        if (f.centered) {
          f.html = `<span class='slidego-centered'>${f.html}</span>`;
        }
      });
    }
    if (i.subsections) {
      i.subsections.forEach(s => {
        if (s.flows) {
          s.flows.forEach(f => {
            if (f.centered) {
              f.html = `<span class='slidego-centered'>${f.html}</span>`;
            }
          });
        }    
      });
    }
  });
  return contents;
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

function addFlow(f, result, mappings) {
  var rootId = f.id.match(/^([-a-zA-Z0-9._]+)__.*$/);
  rootId = rootId[1];
  if (f.id in mappings) {
    console.log(`Flow has a repeating ID, flow IDs must be unique across all flows, culprit: ${f.id}`);
    process.exit();
  }
  var mapping = {};
  if ('focus' in f) {
    var params = f.focus.match(/^(\S+) (\S+) (\S+)$/)
    var coords = Array.from(`${params[1]}`.matchAll(/([0-9.]+,[0-9.]+,[0-9.]+,[0-9.]+)/g));
    coords = coords.map(c => c[0]);
    coords = coords.map(f => f.replace(/,/g,' '));
    coords = coords.join(';');
    var begin = params[2];
    var duration = params[3] - params[2];
    if (duration < 0) {
      console.log(`end of animation should be after start of animation for 'focus' in ${f.id}`);
      process.exit();
    }
    var focus = `<animate attributeName='viewBox' values='${coords}' begin='${begin}s' dur='${duration}s' fill='freeze' class='focus-anim'></animate>`
    mapping['focus'] = focus;
  }
  if ('highlight' in f) {
    var params = f.highlight.match(/^(\S+) (\S+) (\S+) (\S+) (\S+) (\S+)$/)
    if (!params || params.length == 0) {
      console.log(`Flow ${f.id} has an improperly formatted highlight`);
      process.exit();
    }
    var coords = Array.from(params[1].matchAll(/([0-9.]+,[0-9.]+,[0-9.]+,[0-9.]+)/g));    
    coords = coords.map(c => c[0]);
    var color = params[2];
    var thickness = params[3];
    var keyframes = params[4];
    var begin = params[5];
    var duration = params[6] - params[5];
    if (duration < 0) {
      console.log(`end of animation should be after start of animation for 'highlight' in ${f.id}`);
      process.exit();
    }
    var highlight = '';
    coords.forEach(c => {
      var values = c.match(/([0-9.]+),([0-9.]+),([0-9.]+),([0-9.]+)/);
      highlight += `<rect  x='${values[1]}' y='${values[2]}' width='${values[3]}' height='${values[4]}' stroke='${color}' stroke-width=${thickness} rx=10 ry=10 fill-opacity=0 stroke-opacity=0>`
      highlight += `<animate attributeName='stroke-opacity' values='${keyframes}' begin='${begin}s' dur='${duration}s' fill='freeze' class='highlight-anim'/>`
      highlight += `</rect>`
    });
    mapping['highlight'] = highlight;
  }
  mappings[f.id] = mapping;
  if (!result.includes(rootId)) {
    result.push(rootId);
  }
}

function getAllSvgFilesFromYml(dirname) {
  const contents = fixIds(getYamlAsJson(dirname));
  if (!contents) return [[], {}];
  if (!contents.sections) return [[], {}];
  var result = [];
  var mappings = {};
  contents.sections.forEach(i => {
    if (i.flows) {
      i.flows.forEach(f => {
        addFlow(f, result, mappings);
      });
    }
    if (i.subsections) {
      i.subsections.forEach(s => {
        if (s.flows) {
          s.flows.forEach(f => {
            addFlow(f, result, mappings);
          });
        }    
      });
    }
  });
  result = result.map(r => path.resolve(dirname + path.sep + r + '.svg'));
  return [result, mappings];
}

function removeFocusAndHighlightFromJson(contents) {
  contents.sections.forEach(i => {
    if (i.flows) {
      i.flows.forEach(f => {
        if ("highlight" in f) {
          delete f["highlight"];
        }
        if ("focus" in f) {
          delete f["focus"];
        }
      });
    }
    if (i.subsections) {
      i.subsections.forEach(s => {
        if (s.flows) {
          s.flows.forEach(f => {
            if ("highlight" in f) {
              delete f["highlight"];
            }
            if ("focus" in f) {
              delete f["focus"];
            }
          });
        }    
      });
    }
  });
}

function allSvgFilesFromYmlPresentInFolder(dirname) {
  const svgsInYml = getAllSvgFilesFromYml(dirname)[0];
  var allThere = true;
  svgsInYml.forEach(s => {
    if (!fs.existsSync(s)) {
      allThere = false;
      console.log(`SVG file referenced but not found: ${s}`);
    }    
  });
  return allThere;
}

function getSvgReplacementString(dirname) {
  const svgsInYml = getAllSvgFilesFromYml(dirname)[0];
  let result = [];
  svgsInYml.forEach(s => {
    var id = path.basename(s,path.extname(s));
    var data = fs.readFileSync(s, 'utf8');
    var svg = data.match(/<svg\s.*<\/svg>/gs);
    if (!svg) {
      console.log(`SVG file \"${s}\" doesn't match regex /<svg\s.*<\/svg>/gs for extraction.`)
      process.exit();
    }
    result.push(`<div id="${id}" class="flow">\n${svg}\n</div>\n`);
  });
  return result.join("\n");
}

function doWrite(dirname) {
  var template = fs.readFileSync(path.resolve(__dirname, 'template.html'), 'utf8');
  var svgs = getSvgReplacementString(dirname);
  var mappings = getAllSvgFilesFromYml(dirname)[1];
  var narration = adjustForCentered(fixIds(getYamlAsJson(dirname)));
  removeFocusAndHighlightFromJson(narration);
  var output = template.replace("<!--%SVGS%-->",svgs)
    .replace("%NARRATION%",JSON.stringify(narration,null,2))
    .replace("%MAPPINGS%",JSON.stringify(mappings,null,2));
  var outputName = getYamlFileName(dirname);
  outputName = path.basename(outputName,path.extname(outputName));
  outputName += ".html";
  fs.writeFileSync(dirname + path.sep + outputName, output);
}

function doSeed(dirname) {
  fs.copyFileSync(path.resolve(__dirname, 'seed.yml'), dirname + path.sep + 'slideshow.yml');
  fs.copyFileSync(path.resolve(__dirname, 'empty-svg.svg'), dirname + path.sep + 'first-svg.svg');
  fs.copyFileSync(path.resolve(__dirname, 'empty-svg.svg'), dirname + path.sep + 'second-svg.svg');
  doWrite(dirname);
  console.log(`
  Wrote out 'slideshow.yml' and 'empty-svg' into ${dirname}.

  Edit 'slideshow.yml' to create your slides.  Notice how 'first-svg.svg' and
  'second-svg.svg' SVG files are referenced from the 'id' properties in the 
  slideshow (sans '.svg' extension).

  Rename/copy 'first-svg.svg'/'second-svg.svg' into more SVG files.  Edit them.  
  Then use in your slide show by referencing via the 'id' properties.

  Look at 'slideshow.html' to see your slideshow.  Re-run after modifying 'slideshow.yml'
  and messing around with SVGs as needed.
  `);
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
      doSeed(options.folder);
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

  doWrite(options.folder);
}