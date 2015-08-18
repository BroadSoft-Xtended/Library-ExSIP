## What you need to build ExSIP

You just need to have [Node.js](http://nodejs.org/) and [Git](http://git-scm.com/).


### Node.js

* [Install Node.js via package manager](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager)
  e.g. on fedora
   yum install npm

* [Install Node.js from sources](http://nodejs.org)

### Git

* [Install Git](http://git-scm.com/book/en/Getting-Started-Installing-Git)


### PhantomJS

(optional, just for running unit tests)

* [Install PhantomJS](http://phantomjs.org/download.html)
* In modern Debian/Ubuntu systems PhantomJS can be installed via `apt-get install phantomjs`


## How to build ExSIP

Install grunt-cli globally:
```
$ npm install -g grunt-cli
```

Enter the directory and install the Node.js dependencies:
```
$ cd ExSIP && npm install
```

Make sure you have `grunt` installed by testing:
```
$ grunt -version
```

Finally, run `grunt` command with no arguments to get a complete version of ExSIP:
```
$ grunt dist
```

The built version of ExSIP will be available in the `dist/` subdirectory in both flavors: normal (uncompressed)  and minified, both linted with [JSLint](http://jslint.com/). There will be also a file named `dist/exsip-devel.js` which is an exact copy of the uncompressed file.


## Development version

Run `grunt devel` for just generating the `dist/exsip-devel.js` file. An uncompressed ExSIP source file named `exsip-devel.js` will be created in `dist` directory.


## Test units

ExSIP includes test units based on [QUnit](http://qunitjs.com/). Test units use the `dist/exsip-devel.js` file. Run the tests as follows:
```
$ grunt test

Running "qunit-serverless:all" (qunit-serverless) task
...
654 tests complete (1.6 seconds)
```