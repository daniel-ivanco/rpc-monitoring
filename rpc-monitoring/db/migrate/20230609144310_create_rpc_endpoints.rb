class CreateRpcEndpoints < ActiveRecord::Migration[7.0]
  def change
    create_table :rpc_endpoints do |t|
      t.string :name
      t.string :url

      t.timestamps
    end
  end
end
