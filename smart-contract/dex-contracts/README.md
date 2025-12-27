# dex_contracts

## Usage
It's recommended to install 
[cargo-odra](https://github.com/odradev/cargo-odra) first.

### Build

```
$ cargo odra build
```
To build a wasm file, you need to pass the -b parameter. 
The result files will be placed in `${project-root}/wasm` directory.

```
$ cargo odra build -b casper
```

### Test
To run test on your local machine, you can basically execute the command:

```
$ cargo odra test
```

To test actual wasm files against a backend, 
you need to specify the backend passing -b argument to `cargo-odra`.

```
$ cargo odra test -b casper
```


export PATH="$HOME/.cargo/bin:$PATH"

### Deploy
To deploy the contract to a local node, you can use the command:

```
$ cargo odra deploy