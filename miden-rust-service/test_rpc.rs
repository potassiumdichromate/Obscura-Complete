use miden_client::rpc::*;

fn main() {
    // This will fail to compile but show us what's available
    println!("{:?}", std::any::type_name::<NodeRpcClient>());
}