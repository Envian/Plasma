# Plasma (Alpha)
A Standalone plugin for salesforce development. This is currently in an early alpha and is likely unsuitable for regular
use. See features, limitations and known issues below.

### Usage
1. Right-Click the folder you want to turn into a Salesforce project, and select `Plasma > New Project`.
2. Ensure the project path is correct. If you are using a project downloaded earlier, this folder should contain the `src` folder.
3. Select the correct organization type and Authenticate.
4. Create project.
5. Copy or Create a `Package.xml` file in your `src` folder. See [Sample package.xml Manifest Files](https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/manifest_samples.htm) for help.
6. Refresh From Server.

Projects are defined by the `plasma.json` file found in your `config` folder. Deleting this file will reset the project.
Passwords are not stored in `plasma.json`, but rather on your keychain with [Keytar](https://github.com/atom/node-keytar).
It is safe to move these projects as necessary, but sharing between different users will require reauthentication.

### Features
* Secure authentication with Salesforce.
* Refreshing From Server.
* Editing Apex classes, triggers, pages, lightning components, and static resources.
* Overwrite conflict checking.
* Compile error highlighting.

### Known Bugs
* Error handling is currently very poor. If you are not seeing any notifications, check the developer tools console under
`View > Developer > Toggle Developer Tools`.
* Server type is not preserved.
* Static resource's `User Server Copy` currently does not work.

### Limitations
These are the current limitations of the alpha. Everything listed here will be implemented in the future.

* `Package.xml` files must be created manually. ([Sample package.xml Manifest Files](https://developer.salesforce.com/docs/atlas.en-us.api_meta.meta/api_meta/manifest_samples.htm))
* No test running framework.
* No support for deleting or creating new files.
* No saving multiple files at once at this time.
* No support for making metadata changes to files.

## Roadmap
Version `0.3.0` will enable support for saving new files directly from Atom, and making changes to metadata in various files.
Version `0.4.0` will be focused on test running and debugging.

## Contributing & Requests
If you have any requests, would like to contribute, or just want to say thanks, please reach out to [Envian](https://github.com/Envian) on
Github.
