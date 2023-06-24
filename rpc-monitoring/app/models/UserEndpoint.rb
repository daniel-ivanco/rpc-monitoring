class UserEndpoint < ApplicationRecord
  belongs_to :user
  belongs_to :rpc_endpoint
end
