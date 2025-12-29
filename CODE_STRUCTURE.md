# Project Code Structure

## Directory Structure Visualization

```mermaid
graph TD
    root["/"]
    
    %% App Router
    subgraph APP ["/app"]
        direction TB
        layout["layout.tsx"]
        page["page.tsx (Step 1)"]
        
        subgraph ROUTE_SLICE ["/slice"]
            p_slice["page.tsx (Step 2)"]
        end
        
        subgraph ROUTE_REVIEW ["/review"]
            p_review["page.tsx (Step 3)"]
        end
        
        subgraph ROUTE_EXPORT ["/export"]
            p_export["page.tsx (Step 4)"]
        end
        
        subgraph API ["/api"]
            api_slice["/slice/route.ts"]
            api_prompt["/generate/prompt/route.ts"]
            api_image["/generate/image/route.ts"]
            api_audio["/generate/audio/route.ts"]
            api_export["/export/route.ts"]
        end
    end

    %% Components
    subgraph COMP ["/components"]
        subgraph UI ["/ui (Shared)"]
            ui_btn["Button.tsx"]
            ui_card["Card.tsx"]
            ui_modal["Modal.tsx"]
            ui_spin["Spinner.tsx"]
            ui_audio["AudioPlayer.tsx"]
        end
        
        subgraph TIMELINE ["/timeline (Step 3 Editor)"]
            tl_cont["TimelineContainer.tsx"]
            tl_conf["ConfigPanel.tsx"]
            tl_prev["PreviewPlayer.tsx"]
        end

        subgraph SHARED_UI ["/ui"]
            ui_modal["EditModal.tsx"]
        end
        
        link_conf_modal["ConfigPanel -> EditModal"]
        
        comp_seg["SegmentCard.tsx"]
    end

    %% Logic Layers
    subgraph LIB ["/lib (Services)"]
        lib_openai["openai.ts"]
        lib_gemini["gemini.ts"]
        lib_minimax["minimax.ts"]
        lib_zod["schemas.ts"]
    end
    
    subgraph CTX ["/context"]
        ctx_proj["ProjectContext.tsx"]
    end
    
    subgraph CONF ["/config"]
        conf_prompts["prompts.ts"]
    end

    %% Relationships
    layout --> ctx_proj
    ctx_proj --> page
    ctx_proj --> p_slice
    ctx_proj --> p_review
    ctx_proj --> p_export
    
    p_review --> tl_cont
    p_review --> tl_conf
    p_review --> tl_prev
    tl_conf --> link_conf_modal
    
    api_slice --> lib_openai
    api_prompt --> lib_openai
    api_image --> lib_gemini
    api_audio --> lib_minimax
    
    lib_openai --> conf_prompts
```

## Key Modules

### 1. Application Flow (Next.js App Router)
- **Step 1 (Setup):** `app/page.tsx` - User inputs script, avatar, and style.
- **Step 2 (Slicing):** `app/slice/page.tsx` - AI segments the script into scenes.
- **Step 3 (Timeline Editor):** `app/review/page.tsx` - Main visual editor.
- **Step 4 (Export):** `app/export/page.tsx` - Final video generation.

### 2. State Management
- **ProjectContext:** Uses `useReducer` to handle the complex state of the video project, including segments, generated assets, and navigation history.

### 3. Timeline Editor Components
- **TimelineContainer:** Handles the horizontal scrolling tracks (Image, Text, Audio). Click-to-play enabled.
- **ConfigPanel:** Quadrant-based editor for prompts and media generation. Replaced legacy InspectorPanel.
- **PreviewPlayer:** Time-driven controlled component. Syncs perfectly with timeline selection.

### 4. AI Services (Stateless)
- **OpenAI:** Used for Script Slicing and Image Prompt Generation.
- **Gemini:** Generates images, returns as Base64.
- **Minimax:** Generates TTS audio, returns as Base64.
- **Zod:** Validates all API request payloads in `lib/schemas.ts`.
