class CreateRpcEndpoints < ActiveRecord::Migration[7.0]
  def change
    enable_extension 'pgcrypto' unless extension_enabled?('pgcrypto')

    create_table :rpc_endpoints, id: :uuid do |t|
      t.string :name
      t.string :url

      t.timestamps
    end

    add_index :rpc_endpoints, :url,  unique: true
  end
end
