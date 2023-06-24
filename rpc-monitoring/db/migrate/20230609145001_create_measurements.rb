class CreateMeasurements < ActiveRecord::Migration[7.0]
  def change
    enable_extension 'pgcrypto' unless extension_enabled?('pgcrypto')

    create_table :measurements, id: :uuid do |t|
      t.bigint :latest_block_diff
      t.boolean :up
      t.references :rpc_endpoint, null: false, foreign_key: true, type: :uuid

      t.timestamps
    end
  end
end
