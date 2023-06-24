class CreateUserEndpoints < ActiveRecord::Migration[7.0]
  def change
    create_table :user_endpoints do |t|
      t.references :user, null: false, foreign_key: true, type: :uuid
      t.references :rpc_endpoint, null: false, foreign_key: true, type: :uuid

      t.timestamps
    end

    add_index :user_endpoints, [:user_id, :rpc_endpoint_id], unique: true
  end
end
