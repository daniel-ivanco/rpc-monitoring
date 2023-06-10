class CreateMeasurements < ActiveRecord::Migration[7.0]
  def change
    create_table :measurements do |t|
      t.bigint :latest_block_diff
      t.boolean :up
      t.references :rpc_endpoint, null: false, foreign_key: true

      t.timestamps
    end
  end
end
