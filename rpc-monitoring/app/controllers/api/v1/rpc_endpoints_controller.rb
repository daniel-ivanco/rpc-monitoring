module Api
  module V1
    class RpcEndpointsController < ApplicationController
      def create
        result = RpcEndpoint.find_or_create_by(url: params[:url])

        render json: {data: result }, status: 200
      end

      def show
        rpc_endpoint = RpcEndpoint.find(params[:id])

        render json: {data: rpc_endpoint }, status: 200
      end

      def add_user
        rpc_endpoint = RpcEndpoint.find(params[:id])
        user = User.find_or_create_by(email: params[:email])

        result = rpc_endpoint.user_endpoints.find_or_create_by! user_id: user.id
        render json: {data: result }, status: 200
      end

      def measurements
        rpc_endpoint = RpcEndpoint.find(params[:id])
        render json: { data: rpc_endpoint.measurements.last(100).pluck(:created_at, :latest_block_diff) }, status: 200
      end
    end
  end
end
