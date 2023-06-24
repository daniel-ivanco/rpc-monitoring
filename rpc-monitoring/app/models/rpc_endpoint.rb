class RpcEndpoint < ApplicationRecord
  has_many :measurements
  has_many :user_endpoints
  has_many :users, through: :user_endpoints
end
