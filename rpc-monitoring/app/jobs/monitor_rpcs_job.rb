class MonitorRpcsJob < ApplicationJob
  queue_as :default

  def perform(*args)
    latest_p2p_block_number = RpcFetcher.new.latest_p2p_block_number

    RpcEndpoint.find_each do |rpc_endpoint|
      latest_rpc_block_number = RpcFetcher.new.latest_rpc_block_number(rpc_url: rpc_endpoint.url)

      if !latest_rpc_block_number
        rpc_endpoint.measurements.create! up: false

        next
      else
        latest_block_diff = latest_rpc_block_number - latest_p2p_block_number

        rpc_endpoint.measurements.create! latest_block_diff: latest_block_diff, up: true
      end
    end

    MonitorRpcsJob.set(wait: 1.minute).perform_later
  end
end
