'use strict';

const assert = require('assert');
const execa = require('execa');
const fetch = require('node-fetch');
const path = require('path');
const Installer = require('../installer');
const { platform, unzip, untar } = require('../common');

function getFilename() {
  switch (platform) {
    case 'linux-x64':
      return 'Linux-x86_64';
    default:
      throw new Error(`Bali does not have binary builds for ${platform}`);
  }
}

class BaliInstaller extends Installer {
  constructor(...args) {
    super(...args);

    this.binPath = undefined;
  }

  static async resolveVersion(version) {
    const artifactName = `Balde`;
    if (version !== 'latest') {
      throw new Error('Bali only provides binary builds for \'latest\'');
    }

    const headers = process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {};
    const artifact = await fetch('https://api.github.com/repos/ferus-web/bali/actions/artifacts', { headers })
      .then((x) => x.json())
      .then((x) => x.artifacts.find((a) => a.name === artifactName))
      .catch(() => {
        throw new Error(`Failed to find any artifacts for ${artifactName} on ferus-web/bali`);
      });
    const run = await fetch('https://api.github.com/repos/ferus-web/bali/actions/runs?event=push&branch=master&status=success', { headers })
      .then((x) => x.json())
      .then((x) => x.workflow_runs.filter((a) => a.name === 'Build artifacts'))
      .then((x) => x.sort((a, b) => a.check_suite_id > b.check_suite_id)[0])
      .catch(() => {
        throw new Error('Failed to find any recent bali build');
      });
    return `${artifact.id}/${run.head_sha}`;
  }

  getDownloadURL(version) {
    const ids = version.split('/');
    return `https://api.github.com/repos/ferus-web/bali/actions/artifacts/${ids[0]}/zip`;
  }

  async extract() {
    await unzip(this.downloadPath, this.extractedPath);
  }

  async install() {
    const js = await this.registerAsset('balde');
    this.binPath = await this.registerScript('bali', `"${js}" run`);
  }

  async test() {
    // const program = 'console.log("42")';
    // const output = '42';

    // assert.strictEqual(
    //   (await execa(this.binPath, ['-c', program])).stdout.includes(output),
    //   true
    // );
  }
}

BaliInstaller.config = {
  name: 'Bali',
  id: 'bali',
  supported: [
    'linux-x64',
  ],
};

module.exports = BaliInstaller;
