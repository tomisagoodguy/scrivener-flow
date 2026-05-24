export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      bank_contacts: {
        Row: {
          bank_name: string
          branch_name: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          last_updated_by: string | null
          loan_conditions: string | null
          note: string | null
          notes: string | null
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          bank_name: string
          branch_name?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_updated_by?: string | null
          loan_conditions?: string | null
          note?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          bank_name?: string
          branch_name?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          last_updated_by?: string | null
          loan_conditions?: string | null
          note?: string | null
          notes?: string | null
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      bank_redemptions: {
        Row: {
          account_info: string | null
          bank_name: string | null
          id: string
          last_updated_by: string | null
          lead_time: string | null
          notes: string | null
          service_phone: string | null
          updated_at: string | null
        }
        Insert: {
          account_info?: string | null
          bank_name?: string | null
          id?: string
          last_updated_by?: string | null
          lead_time?: string | null
          notes?: string | null
          service_phone?: string | null
          updated_at?: string | null
        }
        Update: {
          account_info?: string | null
          bank_name?: string | null
          id?: string
          last_updated_by?: string | null
          lead_time?: string | null
          notes?: string | null
          service_phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      banks: {
        Row: {
          branch: string | null
          contacts: Json | null
          created_at: string | null
          id: string
          loan_conditions: string | null
          name: string
          redemption_account: string | null
          redemption_days: string | null
          redemption_location: string | null
          redemption_note: string | null
          redemption_phone: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          branch?: string | null
          contacts?: Json | null
          created_at?: string | null
          id?: string
          loan_conditions?: string | null
          name: string
          redemption_account?: string | null
          redemption_days?: string | null
          redemption_location?: string | null
          redemption_note?: string | null
          redemption_phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          branch?: string | null
          contacts?: Json | null
          created_at?: string | null
          id?: string
          loan_conditions?: string | null
          name?: string
          redemption_account?: string | null
          redemption_days?: string | null
          redemption_location?: string | null
          redemption_note?: string | null
          redemption_phone?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bare_k_snapshots: {
        Row: {
          created_at: string
          date: string
          inv_chips: Json
          margin: Json
          mas: Json
          ohlcv: Json
          revenue: Json
          signals: Json
          stock_id: string
          summary: Json
        }
        Insert: {
          created_at?: string
          date: string
          inv_chips?: Json
          margin?: Json
          mas?: Json
          ohlcv?: Json
          revenue?: Json
          signals?: Json
          stock_id: string
          summary?: Json
        }
        Update: {
          created_at?: string
          date?: string
          inv_chips?: Json
          margin?: Json
          mas?: Json
          ohlcv?: Json
          revenue?: Json
          signals?: Json
          stock_id?: string
          summary?: Json
        }
        Relationships: []
      }
      case_date_logs: {
        Row: {
          case_id: string | null
          changed_at: string | null
          changed_by: string | null
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          case_id?: string | null
          changed_at?: string | null
          changed_by?: string | null
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          case_id?: string | null
          changed_at?: string | null
          changed_by?: string | null
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_date_logs_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          address: string | null
          agent_name: string | null
          agent_phone: string | null
          bank_contact_notes: string | null
          build_type: string | null
          buyer_name: string
          buyer_phone: string | null
          cancellation_type: string | null
          case_number: string
          chat_groups: Json | null
          check_priority_purchase: boolean | null
          check_seal_certificate: boolean | null
          check_second_mortgage: boolean | null
          city: string
          city_area: string | null
          created_at: string | null
          district: string
          escrow_account: string | null
          handler: string | null
          has_keyed_overtime: boolean | null
          has_tenant: boolean | null
          id: string
          is_back_rent: boolean | null
          is_on_hold: boolean | null
          is_radiation_check: boolean | null
          is_sea_sand_check: boolean | null
          legacy_id: string | null
          notes: string | null
          on_hold_reason: string | null
          pending_tasks: string | null
          private_notes: string | null
          property_type: string | null
          registrant_name: string | null
          registrant_phone: string | null
          seller_loan_bank: string | null
          seller_name: string
          seller_phone: string | null
          status: string
          tax_type: string | null
          todos: Json | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          address?: string | null
          agent_name?: string | null
          agent_phone?: string | null
          bank_contact_notes?: string | null
          build_type?: string | null
          buyer_name: string
          buyer_phone?: string | null
          cancellation_type?: string | null
          case_number: string
          chat_groups?: Json | null
          check_priority_purchase?: boolean | null
          check_seal_certificate?: boolean | null
          check_second_mortgage?: boolean | null
          city: string
          city_area?: string | null
          created_at?: string | null
          district: string
          escrow_account?: string | null
          handler?: string | null
          has_keyed_overtime?: boolean | null
          has_tenant?: boolean | null
          id?: string
          is_back_rent?: boolean | null
          is_on_hold?: boolean | null
          is_radiation_check?: boolean | null
          is_sea_sand_check?: boolean | null
          legacy_id?: string | null
          notes?: string | null
          on_hold_reason?: string | null
          pending_tasks?: string | null
          private_notes?: string | null
          property_type?: string | null
          registrant_name?: string | null
          registrant_phone?: string | null
          seller_loan_bank?: string | null
          seller_name: string
          seller_phone?: string | null
          status: string
          tax_type?: string | null
          todos?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          address?: string | null
          agent_name?: string | null
          agent_phone?: string | null
          bank_contact_notes?: string | null
          build_type?: string | null
          buyer_name?: string
          buyer_phone?: string | null
          cancellation_type?: string | null
          case_number?: string
          chat_groups?: Json | null
          check_priority_purchase?: boolean | null
          check_seal_certificate?: boolean | null
          check_second_mortgage?: boolean | null
          city?: string
          city_area?: string | null
          created_at?: string | null
          district?: string
          escrow_account?: string | null
          handler?: string | null
          has_keyed_overtime?: boolean | null
          has_tenant?: boolean | null
          id?: string
          is_back_rent?: boolean | null
          is_on_hold?: boolean | null
          is_radiation_check?: boolean | null
          is_sea_sand_check?: boolean | null
          legacy_id?: string | null
          notes?: string | null
          on_hold_reason?: string | null
          pending_tasks?: string | null
          private_notes?: string | null
          property_type?: string | null
          registrant_name?: string | null
          registrant_phone?: string | null
          seller_loan_bank?: string | null
          seller_name?: string
          seller_phone?: string | null
          status?: string
          tax_type?: string | null
          todos?: Json | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      contract_clauses: {
        Row: {
          category: string | null
          content: string
          created_at: string | null
          id: string
          last_updated_by: string | null
          tags: string[] | null
          title: string
          updated_at: string | null
          usage_count: number | null
        }
        Insert: {
          category?: string | null
          content: string
          created_at?: string | null
          id?: string
          last_updated_by?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Update: {
          category?: string | null
          content?: string
          created_at?: string | null
          id?: string
          last_updated_by?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          usage_count?: number | null
        }
        Relationships: []
      }
      custom_watchlist: {
        Row: {
          created_at: string
          id: string
          label: string
          stock_code: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string
          stock_code: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          stock_code?: string
          user_id?: string
        }
        Relationships: []
      }
      drive_upload_sessions: {
        Row: {
          created_at: string
          expires_at: string
          file_name: string
          id: string
          upload_url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          file_name: string
          id?: string
          upload_url: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          file_name?: string
          id?: string
          upload_url?: string
          user_id?: string
        }
        Relationships: []
      }
      encryption_keys: {
        Row: {
          created_at: string | null
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          key_id: string
          key_value: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_id: string
          key_value: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          key_id?: string
          key_value?: string
        }
        Relationships: []
      }
      equity_distribution_stats: {
        Row: {
          big_holder_pct: number | null
          big_holder_pct_change: number | null
          mid_holder_pct: number | null
          mid_holder_pct_change: number | null
          shareholders_change_rate: number | null
          snapshot_date: string
          stock_code: string
          stock_name: string | null
          total_shareholders: number | null
          updated_at: string
          whale_holder_pct: number | null
          whale_holder_pct_change: number | null
        }
        Insert: {
          big_holder_pct?: number | null
          big_holder_pct_change?: number | null
          mid_holder_pct?: number | null
          mid_holder_pct_change?: number | null
          shareholders_change_rate?: number | null
          snapshot_date: string
          stock_code: string
          stock_name?: string | null
          total_shareholders?: number | null
          updated_at?: string
          whale_holder_pct?: number | null
          whale_holder_pct_change?: number | null
        }
        Update: {
          big_holder_pct?: number | null
          big_holder_pct_change?: number | null
          mid_holder_pct?: number | null
          mid_holder_pct_change?: number | null
          shareholders_change_rate?: number | null
          snapshot_date?: string
          stock_code?: string
          stock_name?: string | null
          total_shareholders?: number | null
          updated_at?: string
          whale_holder_pct?: number | null
          whale_holder_pct_change?: number | null
        }
        Relationships: []
      }
      etf_active_share: {
        Row: {
          active_share_pct: number | null
          as_vs_mean_a: number | null
          as_vs_mean_b: number | null
          computed_date: string
          etf_a: string
          etf_b: string
          id: number
        }
        Insert: {
          active_share_pct?: number | null
          as_vs_mean_a?: number | null
          as_vs_mean_b?: number | null
          computed_date: string
          etf_a: string
          etf_b: string
          id?: number
        }
        Update: {
          active_share_pct?: number | null
          as_vs_mean_a?: number | null
          as_vs_mean_b?: number | null
          computed_date?: string
          etf_a?: string
          etf_b?: string
          id?: number
        }
        Relationships: []
      }
      etf_aum: {
        Row: {
          aum_100m_twd: number | null
          created_at: string | null
          etf_code: string
          id: number
          snapshot_date: string
        }
        Insert: {
          aum_100m_twd?: number | null
          created_at?: string | null
          etf_code: string
          id?: number
          snapshot_date: string
        }
        Update: {
          aum_100m_twd?: number | null
          created_at?: string | null
          etf_code?: string
          id?: number
          snapshot_date?: string
        }
        Relationships: []
      }
      etf_aum_series: {
        Row: {
          aum_100m: number | null
          created_at: string | null
          cumulative_inflow_yi: number | null
          data_date: string
          etf_code: string
          inflow_100m: number | null
          inflow_share_of_growth: number | null
          nav: number | null
          units: number | null
        }
        Insert: {
          aum_100m?: number | null
          created_at?: string | null
          cumulative_inflow_yi?: number | null
          data_date: string
          etf_code: string
          inflow_100m?: number | null
          inflow_share_of_growth?: number | null
          nav?: number | null
          units?: number | null
        }
        Update: {
          aum_100m?: number | null
          created_at?: string | null
          cumulative_inflow_yi?: number | null
          data_date?: string
          etf_code?: string
          inflow_100m?: number | null
          inflow_share_of_growth?: number | null
          nav?: number | null
          units?: number | null
        }
        Relationships: []
      }
      etf_buying_patterns: {
        Row: {
          created_at: string
          etf_code: string
          event_date: string
          future_returns: Json | null
          id: number
          pattern_type: string
          stock_code: string
        }
        Insert: {
          created_at?: string
          etf_code: string
          event_date: string
          future_returns?: Json | null
          id?: number
          pattern_type: string
          stock_code: string
        }
        Update: {
          created_at?: string
          etf_code?: string
          event_date?: string
          future_returns?: Json | null
          id?: number
          pattern_type?: string
          stock_code?: string
        }
        Relationships: []
      }
      etf_cumulative_drag: {
        Row: {
          annual_excess_volume_kshares_per_yi: number | null
          annual_manager_drag_kshares_per_yi: number | null
          computed_date: string
          days_span: number | null
          etf_code: string
          events_per_year: number | null
          id: number
          n_events: number | null
        }
        Insert: {
          annual_excess_volume_kshares_per_yi?: number | null
          annual_manager_drag_kshares_per_yi?: number | null
          computed_date: string
          days_span?: number | null
          etf_code: string
          events_per_year?: number | null
          id?: number
          n_events?: number | null
        }
        Update: {
          annual_excess_volume_kshares_per_yi?: number | null
          annual_manager_drag_kshares_per_yi?: number | null
          computed_date?: string
          days_span?: number | null
          etf_code?: string
          events_per_year?: number | null
          id?: number
          n_events?: number | null
        }
        Relationships: []
      }
      etf_diff_logs: {
        Row: {
          change_type: string
          created_at: string | null
          curr_shares: number | null
          curr_weight: number | null
          data_date: string
          description: string | null
          diff_shares: number | null
          diff_weight: number | null
          etf_code: string
          id: string
          is_significant: boolean | null
          prev_shares: number | null
          prev_weight: number | null
          stock_code: string
          stock_name: string | null
        }
        Insert: {
          change_type: string
          created_at?: string | null
          curr_shares?: number | null
          curr_weight?: number | null
          data_date: string
          description?: string | null
          diff_shares?: number | null
          diff_weight?: number | null
          etf_code: string
          id?: string
          is_significant?: boolean | null
          prev_shares?: number | null
          prev_weight?: number | null
          stock_code: string
          stock_name?: string | null
        }
        Update: {
          change_type?: string
          created_at?: string | null
          curr_shares?: number | null
          curr_weight?: number | null
          data_date?: string
          description?: string | null
          diff_shares?: number | null
          diff_weight?: number | null
          etf_code?: string
          id?: string
          is_significant?: boolean | null
          prev_shares?: number | null
          prev_weight?: number | null
          stock_code?: string
          stock_name?: string | null
        }
        Relationships: []
      }
      etf_flow_daily: {
        Row: {
          by_etf: Json
          created_at: string | null
          data_date: string
          etfs_covered: string[]
          etfs_lagging: string[]
          inflow: Json
          outflow: Json
          totals: Json
        }
        Insert: {
          by_etf?: Json
          created_at?: string | null
          data_date: string
          etfs_covered?: string[]
          etfs_lagging?: string[]
          inflow?: Json
          outflow?: Json
          totals?: Json
        }
        Update: {
          by_etf?: Json
          created_at?: string | null
          data_date?: string
          etfs_covered?: string[]
          etfs_lagging?: string[]
          inflow?: Json
          outflow?: Json
          totals?: Json
        }
        Relationships: []
      }
      etf_frontrunning_stats: {
        Row: {
          created_at: string | null
          cur_shares: number | null
          delta_pct: number | null
          delta_shares: number | null
          etf_code: string
          event_date: string
          id: number
          is_new_position: boolean | null
          prev_shares: number | null
          r_t0: number | null
          r_t1: number | null
          r_t2: number | null
          stock_code: string
        }
        Insert: {
          created_at?: string | null
          cur_shares?: number | null
          delta_pct?: number | null
          delta_shares?: number | null
          etf_code: string
          event_date: string
          id?: number
          is_new_position?: boolean | null
          prev_shares?: number | null
          r_t0?: number | null
          r_t1?: number | null
          r_t2?: number | null
          stock_code: string
        }
        Update: {
          created_at?: string | null
          cur_shares?: number | null
          delta_pct?: number | null
          delta_shares?: number | null
          etf_code?: string
          event_date?: string
          id?: number
          is_new_position?: boolean | null
          prev_shares?: number | null
          r_t0?: number | null
          r_t1?: number | null
          r_t2?: number | null
          stock_code?: string
        }
        Relationships: []
      }
      etf_holding_periods: {
        Row: {
          created_at: string | null
          end_date: string | null
          etf_code: string
          id: string
          is_active: boolean | null
          start_date: string
          stock_code: string
          stock_name: string
        }
        Insert: {
          created_at?: string | null
          end_date?: string | null
          etf_code: string
          id?: string
          is_active?: boolean | null
          start_date: string
          stock_code: string
          stock_name: string
        }
        Update: {
          created_at?: string | null
          end_date?: string | null
          etf_code?: string
          id?: string
          is_active?: boolean | null
          start_date?: string
          stock_code?: string
          stock_name?: string
        }
        Relationships: []
      }
      etf_holdings_snapshot: {
        Row: {
          amount: number | null
          change_percent: number | null
          currency: string | null
          data_date: string
          etf_code: string
          id: string | null
          is_disposal: boolean
          is_high_200d: boolean | null
          is_high_20d: boolean | null
          is_high_5d: boolean | null
          margin_ratio: number | null
          market_cap: number | null
          monthly_revenue: number | null
          price: number | null
          revenue_mom: number | null
          revenue_momentum_rank: number | null
          revenue_yoy: number | null
          shares: number
          stock_code: string
          stock_name: string
          updated_at: string | null
          volatility: number | null
          weight: number | null
        }
        Insert: {
          amount?: number | null
          change_percent?: number | null
          currency?: string | null
          data_date: string
          etf_code: string
          id?: string | null
          is_disposal?: boolean
          is_high_200d?: boolean | null
          is_high_20d?: boolean | null
          is_high_5d?: boolean | null
          margin_ratio?: number | null
          market_cap?: number | null
          monthly_revenue?: number | null
          price?: number | null
          revenue_mom?: number | null
          revenue_momentum_rank?: number | null
          revenue_yoy?: number | null
          shares: number
          stock_code: string
          stock_name: string
          updated_at?: string | null
          volatility?: number | null
          weight?: number | null
        }
        Update: {
          amount?: number | null
          change_percent?: number | null
          currency?: string | null
          data_date?: string
          etf_code?: string
          id?: string | null
          is_disposal?: boolean
          is_high_200d?: boolean | null
          is_high_20d?: boolean | null
          is_high_5d?: boolean | null
          margin_ratio?: number | null
          market_cap?: number | null
          monthly_revenue?: number | null
          price?: number | null
          revenue_mom?: number | null
          revenue_momentum_rank?: number | null
          revenue_yoy?: number | null
          shares?: number
          stock_code?: string
          stock_name?: string
          updated_at?: string | null
          volatility?: number | null
          weight?: number | null
        }
        Relationships: []
      }
      etf_matched_pairs: {
        Row: {
          active_median_r: number | null
          computed_date: string
          diff_median: number | null
          id: number
          n_active_events: number | null
          n_passive_events: number | null
          passive_median_r: number | null
          stock_code: string
          stock_name: string | null
        }
        Insert: {
          active_median_r?: number | null
          computed_date: string
          diff_median?: number | null
          id?: number
          n_active_events?: number | null
          n_passive_events?: number | null
          passive_median_r?: number | null
          stock_code: string
          stock_name?: string | null
        }
        Update: {
          active_median_r?: number | null
          computed_date?: string
          diff_median?: number | null
          id?: number
          n_active_events?: number | null
          n_passive_events?: number | null
          passive_median_r?: number | null
          stock_code?: string
          stock_name?: string | null
        }
        Relationships: []
      }
      etf_matched_pairs_summary: {
        Row: {
          computed_date: string
          median_of_diffs: number | null
          n_active_higher: number | null
          n_pairs: number | null
          n_passive_higher: number | null
        }
        Insert: {
          computed_date: string
          median_of_diffs?: number | null
          n_active_higher?: number | null
          n_pairs?: number | null
          n_passive_higher?: number | null
        }
        Update: {
          computed_date?: string
          median_of_diffs?: number | null
          n_active_higher?: number | null
          n_pairs?: number | null
          n_passive_higher?: number | null
        }
        Relationships: []
      }
      etf_news: {
        Row: {
          created_at: string
          etf_code: string
          id: number
          pub_date: string
          pub_time: string | null
          source: string
          stock_code: string
          title: string
          url: string | null
        }
        Insert: {
          created_at?: string
          etf_code: string
          id?: number
          pub_date: string
          pub_time?: string | null
          source?: string
          stock_code: string
          title: string
          url?: string | null
        }
        Update: {
          created_at?: string
          etf_code?: string
          id?: number
          pub_date?: string
          pub_time?: string | null
          source?: string
          stock_code?: string
          title?: string
          url?: string | null
        }
        Relationships: []
      }
      etf_pnl_series: {
        Row: {
          active_count: number | null
          data_date: string
          etf_code: string
          total_cost: number | null
          total_mv: number | null
          total_pnl: number | null
          total_pnl_pct: number | null
          total_shares: number | null
        }
        Insert: {
          active_count?: number | null
          data_date: string
          etf_code: string
          total_cost?: number | null
          total_mv?: number | null
          total_pnl?: number | null
          total_pnl_pct?: number | null
          total_shares?: number | null
        }
        Update: {
          active_count?: number | null
          data_date?: string
          etf_code?: string
          total_cost?: number | null
          total_mv?: number | null
          total_pnl?: number | null
          total_pnl_pct?: number | null
          total_shares?: number | null
        }
        Relationships: []
      }
      etf_position_summary: {
        Row: {
          cost_basis: number | null
          curr_price: number | null
          curr_shares: number | null
          data_date: string
          delta_days: number | null
          entry_price: number | null
          etf_code: string
          exit_date: string | null
          first_entry_date: string | null
          is_active: boolean
          mv_now: number | null
          pnl: number | null
          pnl_pct: number | null
          realized_pnl_pct: number | null
          stock_code: string
        }
        Insert: {
          cost_basis?: number | null
          curr_price?: number | null
          curr_shares?: number | null
          data_date: string
          delta_days?: number | null
          entry_price?: number | null
          etf_code: string
          exit_date?: string | null
          first_entry_date?: string | null
          is_active?: boolean
          mv_now?: number | null
          pnl?: number | null
          pnl_pct?: number | null
          realized_pnl_pct?: number | null
          stock_code: string
        }
        Update: {
          cost_basis?: number | null
          curr_price?: number | null
          curr_shares?: number | null
          data_date?: string
          delta_days?: number | null
          entry_price?: number | null
          etf_code?: string
          exit_date?: string | null
          first_entry_date?: string | null
          is_active?: boolean
          mv_now?: number | null
          pnl?: number | null
          pnl_pct?: number | null
          realized_pnl_pct?: number | null
          stock_code?: string
        }
        Relationships: []
      }
      etf_sectors: {
        Row: {
          created_at: string | null
          etf_code: string
          id: number
          sector_name: string
          snapshot_date: string
          weight: number | null
        }
        Insert: {
          created_at?: string | null
          etf_code: string
          id?: number
          sector_name: string
          snapshot_date: string
          weight?: number | null
        }
        Update: {
          created_at?: string | null
          etf_code?: string
          id?: number
          sector_name?: string
          snapshot_date?: string
          weight?: number | null
        }
        Relationships: []
      }
      etf_signals: {
        Row: {
          created_at: string | null
          data_date: string
          etf_codes: string[]
          id: number
          metadata: Json
          signal_type: string
          stock_code: string
          strength: number
        }
        Insert: {
          created_at?: string | null
          data_date: string
          etf_codes?: string[]
          id?: number
          metadata?: Json
          signal_type: string
          stock_code: string
          strength?: number
        }
        Update: {
          created_at?: string | null
          data_date?: string
          etf_codes?: string[]
          id?: number
          metadata?: Json
          signal_type?: string
          stock_code?: string
          strength?: number
        }
        Relationships: []
      }
      etf_stock_overlap: {
        Row: {
          consensus_buy_count: number
          consensus_sell_count: number
          data_date: string
          etf_count: number
          etf_list: Json
          stock_code: string
          total_weight: number
          updated_at: string | null
        }
        Insert: {
          consensus_buy_count?: number
          consensus_sell_count?: number
          data_date: string
          etf_count: number
          etf_list: Json
          stock_code: string
          total_weight: number
          updated_at?: string | null
        }
        Update: {
          consensus_buy_count?: number
          consensus_sell_count?: number
          data_date?: string
          etf_count?: number
          etf_list?: Json
          stock_code?: string
          total_weight?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      etf_weight_history: {
        Row: {
          created_at: string | null
          data_date: string
          etf_code: string
          id: number
          rank: number | null
          shares: number | null
          stock_code: string
          stock_name: string | null
          weight: number
        }
        Insert: {
          created_at?: string | null
          data_date: string
          etf_code: string
          id?: number
          rank?: number | null
          shares?: number | null
          stock_code: string
          stock_name?: string | null
          weight: number
        }
        Update: {
          created_at?: string | null
          data_date?: string
          etf_code?: string
          id?: number
          rank?: number | null
          shares?: number | null
          stock_code?: string
          stock_name?: string | null
          weight?: number
        }
        Relationships: []
      }
      factor_ic_stats: {
        Row: {
          computed_at: string
          factor_name: string
          ic_1d: number | null
          ic_20d: number | null
          ic_5d: number | null
          month: string
        }
        Insert: {
          computed_at?: string
          factor_name: string
          ic_1d?: number | null
          ic_20d?: number | null
          ic_5d?: number | null
          month: string
        }
        Update: {
          computed_at?: string
          factor_name?: string
          ic_1d?: number | null
          ic_20d?: number | null
          ic_5d?: number | null
          month?: string
        }
        Relationships: []
      }
      financials: {
        Row: {
          balance_payment: number | null
          buyer_bank: string | null
          buyer_loan_amount: number | null
          case_id: string
          deed_tax_deadline: string | null
          house_tax_deadline: string | null
          id: string
          land_tax_deadline: string | null
          land_value_tax_deadline: string | null
          pre_collected_fee: number | null
          seller_bank: string | null
          seller_redemption_amount: number | null
          tax_house_land: boolean | null
          tax_repurchase: boolean | null
          total_price: number | null
          vat_type: string | null
        }
        Insert: {
          balance_payment?: number | null
          buyer_bank?: string | null
          buyer_loan_amount?: number | null
          case_id: string
          deed_tax_deadline?: string | null
          house_tax_deadline?: string | null
          id?: string
          land_tax_deadline?: string | null
          land_value_tax_deadline?: string | null
          pre_collected_fee?: number | null
          seller_bank?: string | null
          seller_redemption_amount?: number | null
          tax_house_land?: boolean | null
          tax_repurchase?: boolean | null
          total_price?: number | null
          vat_type?: string | null
        }
        Update: {
          balance_payment?: number | null
          buyer_bank?: string | null
          buyer_loan_amount?: number | null
          case_id?: string
          deed_tax_deadline?: string | null
          house_tax_deadline?: string | null
          id?: string
          land_tax_deadline?: string | null
          land_value_tax_deadline?: string | null
          pre_collected_fee?: number | null
          seller_bank?: string | null
          seller_redemption_amount?: number | null
          tax_house_land?: boolean | null
          tax_repurchase?: boolean | null
          total_price?: number | null
          vat_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financials_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      guidelines: {
        Row: {
          caution: string | null
          created_at: string
          created_by: string | null
          id: string
          legal_info: string | null
          processing_time: string | null
          required_docs: string | null
          role: string
          scenario: string
          special_clauses: string | null
          updated_at: string
        }
        Insert: {
          caution?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          legal_info?: string | null
          processing_time?: string | null
          required_docs?: string | null
          role: string
          scenario: string
          special_clauses?: string | null
          updated_at?: string
        }
        Update: {
          caution?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          legal_info?: string | null
          processing_time?: string | null
          required_docs?: string | null
          role?: string
          scenario?: string
          special_clauses?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      line_followers: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: string
          is_active: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          is_active?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      milestones: {
        Row: {
          balance_amount: number | null
          balance_method: string | null
          balance_payment_date: string | null
          case_id: string
          contract_amount: number | null
          contract_date: string | null
          contract_method: string | null
          handover_appointment: string | null
          handover_date: string | null
          id: string
          loan_approved_amount: number | null
          loan_shortfall_pay_date: string | null
          redemption_date: string | null
          seal_amount: number | null
          seal_appointment: string | null
          seal_date: string | null
          seal_method: string | null
          sign_appointment: string | null
          sign_diff_amount: number | null
          sign_diff_date: string | null
          sign_diff_days: number | null
          tax_amount: number | null
          tax_appointment: string | null
          tax_filing_date: string | null
          tax_method: string | null
          tax_payment_date: string | null
          transfer_date: string | null
          transfer_note: string | null
        }
        Insert: {
          balance_amount?: number | null
          balance_method?: string | null
          balance_payment_date?: string | null
          case_id: string
          contract_amount?: number | null
          contract_date?: string | null
          contract_method?: string | null
          handover_appointment?: string | null
          handover_date?: string | null
          id?: string
          loan_approved_amount?: number | null
          loan_shortfall_pay_date?: string | null
          redemption_date?: string | null
          seal_amount?: number | null
          seal_appointment?: string | null
          seal_date?: string | null
          seal_method?: string | null
          sign_appointment?: string | null
          sign_diff_amount?: number | null
          sign_diff_date?: string | null
          sign_diff_days?: number | null
          tax_amount?: number | null
          tax_appointment?: string | null
          tax_filing_date?: string | null
          tax_method?: string | null
          tax_payment_date?: string | null
          transfer_date?: string | null
          transfer_note?: string | null
        }
        Update: {
          balance_amount?: number | null
          balance_method?: string | null
          balance_payment_date?: string | null
          case_id?: string
          contract_amount?: number | null
          contract_date?: string | null
          contract_method?: string | null
          handover_appointment?: string | null
          handover_date?: string | null
          id?: string
          loan_approved_amount?: number | null
          loan_shortfall_pay_date?: string | null
          redemption_date?: string | null
          seal_amount?: number | null
          seal_appointment?: string | null
          seal_date?: string | null
          seal_method?: string | null
          sign_appointment?: string | null
          sign_diff_amount?: number | null
          sign_diff_date?: string | null
          sign_diff_days?: number | null
          tax_amount?: number | null
          tax_appointment?: string | null
          tax_filing_date?: string | null
          tax_method?: string | null
          tax_payment_date?: string | null
          transfer_date?: string | null
          transfer_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "milestones_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      note_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          note_id: string | null
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          note_id?: string | null
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          note_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "note_comments_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "team_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      note_likes: {
        Row: {
          created_at: string | null
          id: string
          note_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          note_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          note_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "note_likes_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "team_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          email: string | null
          full_name: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      redemption_steps: {
        Row: {
          case_id: string
          created_at: string
          done_date: string | null
          id: string
          is_done: boolean
          note: string | null
          step_number: number
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id: string
          created_at?: string
          done_date?: string | null
          id?: string
          is_done?: boolean
          note?: string | null
          step_number: number
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string
          created_at?: string
          done_date?: string | null
          id?: string
          is_done?: boolean
          note?: string | null
          step_number?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemption_steps_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      sector_strength: {
        Row: {
          avg_amount_5d: number | null
          breadth: number | null
          category: string
          created_at: string
          date: string
          id: number
          ret_1d: number | null
          ret_20d: number | null
          ret_5d: number | null
          stock_count: number
          strength_score: number | null
          total_amount: number | null
        }
        Insert: {
          avg_amount_5d?: number | null
          breadth?: number | null
          category: string
          created_at?: string
          date: string
          id?: number
          ret_1d?: number | null
          ret_20d?: number | null
          ret_5d?: number | null
          stock_count?: number
          strength_score?: number | null
          total_amount?: number | null
        }
        Update: {
          avg_amount_5d?: number | null
          breadth?: number | null
          category?: string
          created_at?: string
          date?: string
          id?: number
          ret_1d?: number | null
          ret_20d?: number | null
          ret_5d?: number | null
          stock_count?: number
          strength_score?: number | null
          total_amount?: number | null
        }
        Relationships: []
      }
      sector_strength_stocks: {
        Row: {
          amount: number | null
          category: string
          created_at: string
          date: string
          id: number
          is_strategy_hit: boolean
          momentum_score: number | null
          ret_1d: number | null
          ret_20d: number | null
          ret_5d: number | null
          stock_id: string
          stock_name: string | null
        }
        Insert: {
          amount?: number | null
          category: string
          created_at?: string
          date: string
          id?: number
          is_strategy_hit?: boolean
          momentum_score?: number | null
          ret_1d?: number | null
          ret_20d?: number | null
          ret_5d?: number | null
          stock_id: string
          stock_name?: string | null
        }
        Update: {
          amount?: number | null
          category?: string
          created_at?: string
          date?: string
          id?: number
          is_strategy_hit?: boolean
          momentum_score?: number | null
          ret_1d?: number | null
          ret_20d?: number | null
          ret_5d?: number | null
          stock_id?: string
          stock_name?: string | null
        }
        Relationships: []
      }
      stock_basic_info: {
        Row: {
          industry: string | null
          name_full: string | null
          name_short: string | null
          stock_code: string
          updated_at: string | null
        }
        Insert: {
          industry?: string | null
          name_full?: string | null
          name_short?: string | null
          stock_code: string
          updated_at?: string | null
        }
        Update: {
          industry?: string | null
          name_full?: string | null
          name_short?: string | null
          stock_code?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      stock_broker_transactions: {
        Row: {
          buy_amount: number | null
          created_at: string | null
          data_date: string
          force_metric: number | null
          net_volume: number | null
          sell_amount: number | null
          stock_code: string
        }
        Insert: {
          buy_amount?: number | null
          created_at?: string | null
          data_date: string
          force_metric?: number | null
          net_volume?: number | null
          sell_amount?: number | null
          stock_code: string
        }
        Update: {
          buy_amount?: number | null
          created_at?: string | null
          data_date?: string
          force_metric?: number | null
          net_volume?: number | null
          sell_amount?: number | null
          stock_code?: string
        }
        Relationships: []
      }
      stock_prices_daily: {
        Row: {
          amount: number | null
          close: number | null
          created_at: string | null
          currency: string | null
          data_date: string
          high: number | null
          it_buy: number | null
          low: number | null
          margin_ratio: number | null
          open: number | null
          stock_code: string
          volume: number | null
        }
        Insert: {
          amount?: number | null
          close?: number | null
          created_at?: string | null
          currency?: string | null
          data_date: string
          high?: number | null
          it_buy?: number | null
          low?: number | null
          margin_ratio?: number | null
          open?: number | null
          stock_code: string
          volume?: number | null
        }
        Update: {
          amount?: number | null
          close?: number | null
          created_at?: string | null
          currency?: string | null
          data_date?: string
          high?: number | null
          it_buy?: number | null
          low?: number | null
          margin_ratio?: number | null
          open?: number | null
          stock_code?: string
          volume?: number | null
        }
        Relationships: []
      }
      stock_revenue_monthly: {
        Row: {
          created_at: string | null
          data_date: string
          revenue: number | null
          revenue_mom: number | null
          revenue_yoy: number | null
          stock_code: string
        }
        Insert: {
          created_at?: string | null
          data_date: string
          revenue?: number | null
          revenue_mom?: number | null
          revenue_yoy?: number | null
          stock_code: string
        }
        Update: {
          created_at?: string | null
          data_date?: string
          revenue?: number | null
          revenue_mom?: number | null
          revenue_yoy?: number | null
          stock_code?: string
        }
        Relationships: []
      }
      stock_shareholder_weekly: {
        Row: {
          created_at: string | null
          custody_ratio: number | null
          data_date: string
          holder_count: number | null
          shareholder_tier: number
          shares_held: number | null
          stock_code: string
        }
        Insert: {
          created_at?: string | null
          custody_ratio?: number | null
          data_date: string
          holder_count?: number | null
          shareholder_tier: number
          shares_held?: number | null
          stock_code: string
        }
        Update: {
          created_at?: string | null
          custody_ratio?: number | null
          data_date?: string
          holder_count?: number | null
          shareholder_tier?: number
          shares_held?: number | null
          stock_code?: string
        }
        Relationships: []
      }
      strategies: {
        Row: {
          created_at: string | null
          description: string | null
          is_active: boolean | null
          max_holdings: number | null
          strategy_code: string
          strategy_id: number
          strategy_name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          max_holdings?: number | null
          strategy_code: string
          strategy_id?: number
          strategy_name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          is_active?: boolean | null
          max_holdings?: number | null
          strategy_code?: string
          strategy_id?: number
          strategy_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      strategy_changes_log: {
        Row: {
          change_type: string
          created_at: string | null
          data_date: string
          id: number
          new_rank: number | null
          prev_rank: number | null
          stock_code: string
          stock_name: string | null
          strategy_code: string
        }
        Insert: {
          change_type: string
          created_at?: string | null
          data_date: string
          id?: number
          new_rank?: number | null
          prev_rank?: number | null
          stock_code: string
          stock_name?: string | null
          strategy_code: string
        }
        Update: {
          change_type?: string
          created_at?: string | null
          data_date?: string
          id?: number
          new_rank?: number | null
          prev_rank?: number | null
          stock_code?: string
          stock_name?: string | null
          strategy_code?: string
        }
        Relationships: []
      }
      strategy_daily_holdings: {
        Row: {
          amount: number | null
          close_price: number | null
          created_at: string | null
          data_date: string
          id: number
          natr: number | null
          price_to_high_pct: number | null
          rank_position: number
          revenue_mom: number | null
          revenue_yoy: number | null
          rs_rank: number | null
          stock_code: string
          strategy_code: string
        }
        Insert: {
          amount?: number | null
          close_price?: number | null
          created_at?: string | null
          data_date: string
          id?: number
          natr?: number | null
          price_to_high_pct?: number | null
          rank_position: number
          revenue_mom?: number | null
          revenue_yoy?: number | null
          rs_rank?: number | null
          stock_code: string
          strategy_code: string
        }
        Update: {
          amount?: number | null
          close_price?: number | null
          created_at?: string | null
          data_date?: string
          id?: number
          natr?: number | null
          price_to_high_pct?: number | null
          rank_position?: number
          revenue_mom?: number | null
          revenue_yoy?: number | null
          rs_rank?: number | null
          stock_code?: string
          strategy_code?: string
        }
        Relationships: []
      }
      strategy_signals: {
        Row: {
          conditions: Json | null
          created_at: string | null
          date: string
          id: number
          is_selected: boolean
          score: number | null
          stock_id: string
          strategy_id: string
        }
        Insert: {
          conditions?: Json | null
          created_at?: string | null
          date: string
          id?: number
          is_selected: boolean
          score?: number | null
          stock_id: string
          strategy_id: string
        }
        Update: {
          conditions?: Json | null
          created_at?: string | null
          date?: string
          id?: number
          is_selected?: boolean
          score?: number | null
          stock_id?: string
          strategy_id?: string
        }
        Relationships: []
      }
      team_notes: {
        Row: {
          author_id: string | null
          category: string | null
          content: string | null
          created_at: string | null
          id: string
          is_pinned: boolean | null
          like_count: number | null
          tags: string[] | null
          title: string
          updated_at: string | null
          view_count: number | null
        }
        Insert: {
          author_id?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          like_count?: number | null
          tags?: string[] | null
          title: string
          updated_at?: string | null
          view_count?: number | null
        }
        Update: {
          author_id?: string | null
          category?: string | null
          content?: string | null
          created_at?: string | null
          id?: string
          is_pinned?: boolean | null
          like_count?: number | null
          tags?: string[] | null
          title?: string
          updated_at?: string | null
          view_count?: number | null
        }
        Relationships: []
      }
      todos: {
        Row: {
          case_id: string | null
          content: string
          created_at: string | null
          due_date: string | null
          end_date: string | null
          id: string
          is_all_day: boolean | null
          is_completed: boolean | null
          is_deleted: boolean | null
          priority: string | null
          source_key: string | null
          source_type: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          case_id?: string | null
          content: string
          created_at?: string | null
          due_date?: string | null
          end_date?: string | null
          id?: string
          is_all_day?: boolean | null
          is_completed?: boolean | null
          is_deleted?: boolean | null
          priority?: string | null
          source_key?: string | null
          source_type?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          case_id?: string | null
          content?: string
          created_at?: string | null
          due_date?: string | null
          end_date?: string | null
          id?: string
          is_all_day?: boolean | null
          is_completed?: boolean | null
          is_deleted?: boolean | null
          priority?: string | null
          source_key?: string | null
          source_type?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "todos_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          created_at: string | null
          custom_quick_notes: Json | null
          dashboard_notes: Json | null
          message_templates: Json | null
          scratchpad_content: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          custom_quick_notes?: Json | null
          dashboard_notes?: Json | null
          message_templates?: Json | null
          scratchpad_content?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string | null
          custom_quick_notes?: Json | null
          dashboard_notes?: Json | null
          message_templates?: Json | null
          scratchpad_content?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      watch_list: {
        Row: {
          created_at: string
          id: string
          name: string
          stock_id: string
          strategies: string[]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string
          stock_id: string
          strategies?: string[]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          stock_id?: string
          strategies?: string[]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_old_encryption_keys: { Args: never; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
