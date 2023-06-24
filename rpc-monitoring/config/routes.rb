Rails.application.routes.draw do
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Defines the root path route ("/")
  # root "articles#index"

  namespace 'api' do
    namespace 'v1' do
      resources :rpc_endpoints, only: [:create, :show] do
        member do
          get :measurements
          post :add_user
        end
      end
    end
  end
end
