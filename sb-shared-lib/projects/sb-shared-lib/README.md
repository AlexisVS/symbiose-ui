# SharedLib

This library was generated with [Angular CLI](https://github.com/angular/angular-cli) version 11.2.6.

It holds the common code to the Symbiose UI Apps: Angular basic modules & Angular Material Components.


## Code scaffolding

Run `ng generate component component-name --project shared-lib` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module --project shared-lib`.
> Note: Don't forget to add `--project shared-lib` or else it will be added to the default project in your `angular.json` file. 

## Build

Run `ng build shared-lib` to build the project. The build artifacts will be stored in the `dist/` directory.

In order to make the library available for being consumed by Apps, it must be linked using `npm link` in the `dist/` directory.

## Publishing

After building your library with `ng build shared-lib`, go to the dist folder `cd dist/shared-lib` and run `npm publish`.

## Running unit tests

Run `ng test shared-lib` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
