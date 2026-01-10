use clap::{Parser, Subcommand};
use std::process::Command;

#[derive(Parser)]
#[command(name = "aleph-tui")]
#[command(about = "Aleph Wiki TUI utilities", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Start a local SPARQL endpoint using Oxigraph
    Sparql {
        /// Port to bind the server to
        #[arg(short, long, default_value = "7878")]
        port: u16,

        /// Host to bind the server to
        #[arg(long, default_value = "127.0.0.1")]
        host: String,

        /// Data directory for Oxigraph storage
        #[arg(short, long, default_value = "./data/oxigraph")]
        data_dir: String,
    },
}

fn main() -> anyhow::Result<()> {
    let cli = Cli::parse();

    match cli.command {
        Commands::Sparql { port, host, data_dir } => {
            println!("Starting Oxigraph SPARQL server...");
            println!("Data directory: {}", data_dir);
            println!("SPARQL endpoint: http://{}:{}/query", host, port);
            println!("Server running at http://{}:{}", host, port);

            let status = Command::new("oxigraph")
                .arg("serve")
                .arg("--location")
                .arg(&data_dir)
                .arg("--bind")
                .arg(format!("{}:{}", host, port))
                .status()?;

            if !status.success() {
                anyhow::bail!("oxigraph server exited with status: {}", status);
            }

            Ok(())
        }
    }
}
