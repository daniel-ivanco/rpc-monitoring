class User < ApplicationRecord
  has_many :user_endpoints
  has_many :rpc_endpoints, through: :user_endpoints
end
