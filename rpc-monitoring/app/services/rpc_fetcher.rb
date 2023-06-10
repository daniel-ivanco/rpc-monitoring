# frozen_string_literal: true

class RpcFetcher
  BASE_P2P_URL = "http://localhost:3000/api".freeze

  def latest_p2p_block_number
    response = RestClient::Request.execute(method: :get, url: "#{BASE_P2P_URL}/mainnet/latestBlock") {|response, _request, _result| response }
    parsed_response = JSON.parse(response)

    return nil unless response&.code == 200 && (parsed_response.is_a? Numeric)

    parsed_response

    rescue
      nil
  end

  def latest_rpc_block_number(rpc_url:)
    client = Eth::Client.create rpc_url
    response = client.eth_block_number

    response['result'].hex
  end
end