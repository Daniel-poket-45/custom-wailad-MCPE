// @ts-check
import { world, system, BlockTypes, BlockStates, Entity, ItemStack, ItemComponent, EntityItemComponent, ItemType, ItemTypes } from "@minecraft/server";
const viewDistance = 8;

/**
 * @param {import("@minecraft/server").Player} player
 */
export const wawla = (player) => {
    /**
     * @param {import("@minecraft/server").Entity} entity
     * @param {import("@minecraft/server").Block} block
     * @param {import("@minecraft/server").ItemComponent} item
     */

    const entity = player.getEntitiesFromViewDirection()[0]?.entity;
    const block = player.getBlockFromViewDirection({ maxDistance: viewDistance })?.block;

    //se for uma entidade e estiver no range do player
    if(entity && isInRange(player.getHeadLocation(), entity.location)) {
        const item = entity.getComponent("minecraft:item");
        const addonIdentifier = (
            item != null ?
                item.itemStack.typeId.split(":")[0] : entity.typeId.split(":")[0]
        );

        const addonId = (
            addonIdentifier
                .replaceAll("_", " ")
                .replace(/(\b[a-z](?!\s))/g, (x) => x.toUpperCase())
        );

        if(item){
            //const isBlock = BlockTypes.getAll().map((block) => block.id).includes(item.itemStack.typeId);

            //TODO
            // Versão adaptada e corrigida para itens dropados
            const itemEntity = entity.getComponent("minecraft:item"); // Pega o componente de item da entidade
            const itemStack = itemEntity?.itemStack; // Obtém o ItemStack

            // Verificação CORRETA de durabilidade (modo seguro)
            const durability = itemStack?.getComponent("durability");
            const hasDurability = durability !== undefined;

            // Adquire as prócimas constantes de durabilidade, caso existam
            const currentDurability = hasDurability ? durability.damage : undefined;
            const maxDurability = hasDurability ? durability.maxDurability : undefined;

            // Exibe as informações do item na ActionBar
            player.onScreenDisplay.setActionBar({
                rawtext: [
                    //for item name
                    {
                        translate: item.itemStack.localizationKey,
                    },

                    //for geral items data
                    { text: ` ${item.itemStack.amount}x` },
                    { text: item.itemStack.nameTag ? ("\n§7Display name: " + item.itemStack.nameTag) : "" },

                    //TODO for equipments
                    //{ text: item.itemStack.type? `\n§7Type: ${item.itemStack.type}` : "" },
                    //@ts-ignore
                    { text: hasDurability ? `\n§7Durability: §e${maxDurability - currentDurability}§7 / §e${maxDurability}` : "" },

                    //for addon ID
                    { text: `\n§9§o${addonId}` },
                ],
            });

            return;
        };

        // @ts-ignore
        const tameProbability = entity.getComponent("minecraft:tameable")?.probability.toFixed(2) * 100 || 0;
        const isBaby = entity.getComponent("minecraft:is_baby") !== undefined;
        const entityId = entity.typeId.split(":")[1];
        const health = entity.getComponent("minecraft:health");
        const ageable = entity.getComponent("minecraft:ageable");
        //TODOconst feedable = entity.getComponent("minecraft:feedable");

        // Exibe as informações da entidade na ActionBar
        player.onScreenDisplay.setActionBar({
            rawtext: [
                //for entity name
                {
                    translate: entity.localizationKey,
                },
                
                //for players
                { text: entity.typeId == "minecraft:player" ? `\n§7Nickname: ${entity.name}` : "" },
                { text: entity.typeId == "minecraft:player" ? `\n§7Platform: ${entity.clientSystemInfo.platformType}` : "" },
                { text: entity.typeId == "minecraft:player" ? `\n§7Gamemode: ${entity.getGameMode()}` : "" },

                //for geral
                { text: health ? ("\n" + healthToText(Math.round(health.currentValue), health.defaultValue)) : "" },
                { text: entity.typeId != "minecraft:player" && entity.nameTag ? ("\n§7Nametag: " + entity.nameTag) : "" },

                //for villagers
                { text: entity.typeId.includes("minecraft:villager") ? `\n§7Profession: ` : ""}, { translate: entity.typeId.includes("minecraft:villager") ? `${getVillagerProfession(entity)}` : "" },
                { text: entity.typeId.includes("minecraft:villager") ? `\n§7Biome: ` : ""},      { translate: entity.typeId.includes("minecraft:villager") ? `${getVillagerBiome(entity)}` : "" },

                //for geral baby entitys
                { text: isBaby ? `\n§7Baby (Grows in:§f ${ageable !== null ? getEntityGrowingTime(entity) : "Never"})` : "" },
                ...(isBaby ? [
                    { text: "\n§7Feed with:" },
                    ...getBabyFeedItems(entity).flatMap(item => [
                        { text: "\n" },
                        item
                    ])
                ] : []),

                //for tameable entitys
                { text: tameProbability > 0 ? ("\n§7Tame Chance: " + tameProbability + "%") : "" },
                
                //for addon ID
                { text: `\n§9§o${addonId}` },
            ],
        });

    }else if(block){
        const tool = getTool(block);
        const isSilkTouch = requiresSilkTouch(block);
        const toolRequired = getToolMaterialRequired(block);

        const BlockName = block.localizationKey;

        const addonId = (
            block.typeId.split(":")[0]
                .replaceAll("_", " ")
                .replace(/(\b[a-z](?!\s))/g, (x) => x.toUpperCase())
        );

        const honeyLevel = block.permutation.getState("honey_level");
        const compostLevel = block.permutation.getState("composter_fill_level");
        const cauldron_fill_level = Math.round(block.permutation.getState("fill_level")/6 * 100);

        let growth = undefined;
        if(crops[block.typeId]){
            const maxGrowth = crops[block.typeId];
            let currentGrowth = undefined;

            //permutadores do bloco para verfiicação de existência de estado de crescimento
            const cropPermutations = block.permutation.getAllStates();

            //tratador de crescimento genérico
            for(const [key] of Object.entries(cropPermutations)){
                //se o estado age ou growth existir
                if(key.includes("growth") || key.includes("age")){
                    currentGrowth = block.permutation.getState(key);

                    const percentage = Math.round((currentGrowth !== 0 ? currentGrowth / maxGrowth : 0) * 100);
                    growth = (
                        percentage == 100
                            ? "§aGrown"
                            : `${percentage}%`
                    );
                };
            };
        };

        // Exibe as informações do bloco na ActionBar
        player.onScreenDisplay.setActionBar({
            rawtext: [
                {
                    translate: BlockName,
                },
                { text: growth ? (`\n§7Growth: ${growth}`) : "" },
                { text: isSilkTouch ? "\n§7Silk Touch Recommended" : "" },
                { text: honeyLevel ? (`\n§7Honey: ${honeyLevel}/5`) : "" },
                { text: block.getRedstonePower() > 0 ? (`\n§7Redstone Power: ${block.getRedstonePower()}`) : "" },
                { text: compostLevel ? (`\n§7Compost level: ${Math.round(compostLevel/8 * 100)}%`) : "" },
                { text: cauldron_fill_level ? (`\nCauldron fill: ${Math.round(block.permutation.getState("fill_level")/6 * 100)}%`) : "" },
                { text: tool?.tool ? (`\n§7Correct Tool: §3${tool.tool}${toolRequired !== "Any" ? `§r (§e${toolRequired}§r)` : ""}`) : "" },
                { text: tool?.farmable ? (`\n§7Farmable: ${tool.farmable ? "§aYes" : "§cNo"}`) : "" },
                { text: block.typeId.includes("gold_block") ? "\n§7Block Info: §cDouradinha...§r" : "" },
                { text: `\n§9§o${addonId}` },
            ],
        });
    };
};

/** const netheriteTier = [];
    const diamondTier = [];
    const ironTier = [];
    const stoneTier = [];
    const goldTier = [];
    const woodTier = [];
    const chainmailTier = [];
    const copperTier = [];
    const leatherTier = [];
    //TODO if(is_tool) e else if is_armor */

export const getToolTier = (item) => {
    const netheriteTier = [];
    const diamondTier = [];
    const ironTier = [];
    const stoneTier = [];
    const goldTier = [];
    const woodTier = [];
    const copperTier = [];
}

export const getArmorTier = (item) => {
    const netheriteTier = [];
    const diamondTier = [];
    const ironTier = [];
    const stoneTier = [];
    const goldTier = [];
    const woodTier = [];
    const chainmailTier = [];
    const copperTier = [];
    const leatherTier = [];
}

export const getToolMaterialRequired = (block) => {
    const toolTiers = {
        Netherite:  [
            "minecraft:netherite_tier_destructible",
            "netherite_tier_destructible",
            "minecraft:netherite_pick_diggable",
            "netherite_pick_diggable",
            "minecraft:needs_netherite_tool",
            "needs_netherite_tool",
            "minecraft:is_netherite_item_destructible",
            "is_netherite_item_destructible"
        ],

        Diamond: [
            "minecraft:diamond_tier_destructible",
            "diamond_tier_destructible",
            "minecraft:diamond_pick_diggable",
            "diamond_pick_diggable",
            "minecraft:needs_diamond_tool",
            "needs_diamond_tool",
            "minecraft:is_diamond_item_destructible",
            "is_diamond_item_destructible"
        ],

        Iron: [
            "minecraft:iron_tier_destructible",
            "iron_tier_destructible",
            "minecraft:iron_pick_diggable",
            "iron_pick_diggable",
            "minecraft:needs_iron_tool",
            "needs_iron_tool",
            "minecraft:is_iron_item_destructible",
            "is_iron_item_destructible"
        ],

        Stone: [
            "minecraft:stone_tier_destructible",
            "stone_tier_destructible",
            "minecraft:stone_pick_diggable",
            "stone_pick_diggable",
            "minecraft:needs_stone_tool",
            "needs_stone_tool",
            "minecraft:is_stone_item_destructible",
            "is_stone_item_destructible"
        ],

        Gold: [
            "minecraft:gold_tier_destructible",
            "gold_tier_destructible",
            "minecraft:gold_pick_diggable",
            "gold_pick_diggable",
            "minecraft:needs_gold_tool",
            "needs_gold_tool",
            "minecraft:is_gold_item_destructible",
            "is_gold_item_destructible"
        ],

        Wood: [
            "minecraft:wood_tier_destructible",
            "wood_tier_destructible",
            "minecraft:wood_pick_diggable",
            "wood_pick_diggable",
            "minecraft:needs_wood_tool",
            "needs_wood_tool",
            "minecraft:is_wood_item_destructible",
            "is_wood_item_destructible"
        ]
    };

    for (const [toolTier, blockTags] of Object.entries(toolTiers)) {
        if (blockTags.some(currentTag => block.hasTag(currentTag))) {
            return toolTier;
        };
    };

    return "Any";
};

export const getTool = (block) => {
    const id = block.typeId;

    //Axe
    if (
        id.includes("log") 
        || id.includes("planks") 
        || id.includes("fence") 
        || id.includes("wood") 
        || id.includes("banner") 
        || id.includes("sign") 
        || id.includes("crate")
        || block.hasTag("wood") 
        || block.hasTag("log")
        || block.hasTag("axe_diggable")
        || block.hasTag("minecraft:needs_axe")
        || block.hasTag("needs_axe")
        || block.hasTag("minecraft:is_axe_item_destructible")
        || block.hasTag("is_axe_item_destructible")
    ) {
        return { tool: "Axe", farmable: false };
    }

    //Pickaxe
    if (
        id.includes("stone")
        || id.includes("ore")
        || id.includes("brick")
        || id.includes("deepslate")
        || id.includes("lantern")
        || id.includes("anvil")
        || id.includes("spawner")
        || id.includes("_wall")
        || block.hasTag("metal")
        || block.hasTag("needs_stone_tool")
        || block.hasTag("minecraft:needs_pickaxe")
        || block.hasTag("needs_pickaxe")
        || block.hasTag("minecraft:is_pickaxe_item_destructible")
        || block.hasTag("is_pickaxe_item_destructible")
    ) {
        return { tool: "Pickaxe", farmable: false };
    }

    //Shovel
    if (
        id.includes("dirt") 
        || id.includes("sand") 
        || id.includes("gravel") 
        || id.includes("clay")
        || id.includes("mud") 
        || id.includes("path") 
        || id.includes("podzol")
        || block.hasTag("dirt") 
        || block.hasTag("grass") 
        || block.hasTag("shovel_diggable")
        || block.hasTag("minecraft:is_shovel_item_destructible")
        || block.hasTag("is_shovel_item_destructible")
    ) {
        return { tool: "Shovel", farmable: false };
    }

    //Hoe
    if (
        id.includes("hay")
        || id.includes("nether_wart")
        || id.includes("roots")
        || id.includes("weeds")
        || id.includes("carpet")
        || block.hasTag("plant")
        || block.hasTag("hoe_diggable")
        || block.hasTag("minecraft:is_hoe_item_destructible")
        || block.hasTag("is_hoe_item_destructible")
    ) {
        return { tool: "Hoe", farmable: id.includes("crop") || block.hasTag("farmable") };
    }

    //Shears
    if (
        id.includes("leaves")
        || id.includes("vine")
        || id.includes("plant")
        || id.includes("grass")
        || id.includes("moss")
        || id.includes("lichen")
        || id.includes("_root")
        || block.hasTag("shears_diggable")
        || block.hasTag("minecraft:is_shears_item_destructible")
        || block.hasTag("is_shears_item_destructible")
    ) {
        return { tool: "Shears", farmable: id.includes("crop") || block.hasTag("farmable") };

    }

    //Crops/all
    if (
        id.includes("crop") 
        || id.includes("bush") 
        || id.includes("flower")
        || id.includes("sapling")
        || id.includes("stem")
        || id.includes("wild")
        || id.includes("grape")
        || id.includes("berry")
        || id.includes("cocoa")
        || id.includes("bamboo")
        || block.hasTag("crop")
        || block.hasTag("plant")
        || block.hasTag("minecraft:crop")
    ) {
        return { tool: "Hoe/Hand", farmable: true };
    }

    //No tool
    if (
        id.includes("hat")
        || id.includes("decoration")
        || id.includes("light")
        || id.includes("torch")
        || block.hasTag("hand_breakable")
        || block.hasTag("minecraft:hand_breakable")
    ) {
        return { tool: "Hand", farmable: false };
    }

    //Sword
    if (
        id.includes("web")
        || block.hasTag("minecraft:is_sword_item_destructible")
        || block.hasTag("is_sword_item_destructible")
    ) {
        return { tool: "Sword", farmable: false };
    }

    //Brush
    if (
        id.includes("suspicious")
    ) {
        return { tool: "Brush", farmable: false };
    }

    //Fallback
    return {
        tool: "Unknown",
        farmable: false,
    };
};

export const requiresSilkTouch = (block) => {
    const silkTouchTags = [
        "minecraft:requires_silk_touch",
        "requires_silk_touch",
        "minecraft:needs_silk_touch",
        "needs_silk_touch",
        "minecraft:is_silk_touch_item_destructible",
        "is_silk_touch_item_destructible"
    ];
        return silkTouchTags.some((tag) => block.hasTag(tag));
};

export const isInRange = (getHeadLocation, targetLocation) => {
    return(
        Math.abs(targetLocation.x - getHeadLocation.x) < viewDistance
        && Math.abs(targetLocation.z - getHeadLocation.z) < viewDistance
        && Math.abs(targetLocation.y - getHeadLocation.y) < viewDistance
    );
};

const Hearts = { heart: "", halfHeart: "", emptyHeart: "" };
export const healthToText = (currentHealth, maxHealth) => {
    if (!maxHealth) return;
    if (maxHealth <= 40) {
        const max = Math.ceil(maxHealth / 2);
        const health = Math.floor(currentHealth / 2);
        const half = currentHealth % 2 === 1 && health < max;
        const empty = max - health - (half ? 1 : 0);
        const hearts = Hearts.heart.repeat(health) + (half ? Hearts.halfHeart : "") + Hearts.emptyHeart.repeat(empty);

        return splitHearts(hearts);
    } else return "§7Health: " + currentHealth + " / " + maxHealth;
};

const splitHearts = (string) => {
    let result = "";
    for (let i = 0; i < string.length; i += 10) {
        result += string.substr(i, 10) + "\n";
    };

    let data = result.split("\n");
    data = data.filter((item) => item.trim().length != 0);

    return data.join("\n");
};

const getEntityGrowingTime = (entity) => {
    const ageable = entity.getComponent("minecraft:ageable");

    if (ageable && ageable.duration !== undefined) {
        const secondsToGrow = ageable.duration;

        const minutes = Math.floor(secondsToGrow / 60);
        const seconds = Math.ceil(secondsToGrow % 60);
        return `${minutes}m ${seconds}s`;
    };

    return "Unknown";
};

export const getBabyFeedItems = (entity) => {
    const foodArray = entity.getComponent("minecraft:ageable")?.getFeedItems();
    let rawTextArray = [];

    for (const food of foodArray? foodArray : []) {
        const feedItemStack = new ItemStack(food.item);
        if (food?.item) {
            rawTextArray.push({ translate: feedItemStack.localizationKey });
        } else {
            rawTextArray.push({ translate: "item.minecraft.air" });
        };
    }

    return rawTextArray;
};

export const getVillagerBiome = (entity) => {
    //villager mark_variant
    const villagerBiomeVariantTranslations = {
        "Plains" : 0,
        "Desert" : 1,
        "Savanna" : 2,
        "Taiga" : 3,
        "Snow" : 4,
        "Jungle" : 5,
        "Swamp" : 6
    };

    const numTag = entity.getComponent("minecraft:mark_variant")?.value;

    for (const [translationTag, variantTag] of Object.entries(villagerBiomeVariantTranslations)) {
        if (variantTag === numTag) {
            return translationTag;
        };
    };

    return null;
};


export const getVillagerProfession = (entity) => {
    //villager variant
    const villagerProfessionTranslations = {
        "entity.villager.name": 0,     
        "entity.villager.farmer": 1,
        "entity.villager.fisherman": 2,
        "entity.villager.shepherd": 3,
        "entity.villager.fletcher": 4,
        "entity.villager.librarian": 5,
        "entity.villager.cartographer": 6,
        "entity.villager.cleric": 7,
        "entity.villager.armor": 8,
        "entity.villager.weapon": 9,
        "entity.villager.tool": 10,
        "entity.villager.butcher": 11,
        "entity.villager.leather": 12,
        "entity.villager.mason": 13,
        "entity.villager.unskilled": 14
    };

    const numTag = entity.getComponent("minecraft:variant")?.value;

    for (const [translationTag, mark_variantTag] of Object.entries(villagerProfessionTranslations)) {
        if (mark_variantTag === numTag) {
            return translationTag;
        };
    };

    return null;
};



const crops = {
    //vanilla
    "minecraft:wheat": 7,
    "minecraft:potatoes": 7,
    "minecraft:carrots": 7,
    "minecraft:beetroot": 7,
    "minecraft:nether_wart": 3,
    "minecraft:cocoa": 2,
    "minecraft:sweet_berry_bush": 3,
    "minecraft:bamboo": 1,
    "minecraft:torchflower_crop": 7,
    "minecraft:pitcher_crop": 4,
    "minecraft:melon_stem": 7,
    "minecraft:pumpkin_stem": 7,
    "minecraft:berry_bush": 3,

    //miscelaneous vanilla support
    "minecraft:torchflower": 7,
    "minecraft:pitcher_plant": 4,

    //Farmer's delight support
    "farmersdelight:brown_mushroom_colony": 4,
    "farmersdelight:cabbage_block": 7,
    "farmersdelight:onion_block":  7,
    "farmersdelight:red_mushroom_colony": 4,
    "farmersdelight:rice_block": 3,
    "farmersdelight:rice_block_upper": 3,
    "farmersdelight:rich_soil_beetroot": 7,
    "farmersdelight:rich_soil_carrot": 7,
    "farmersdelight:rich_soil_potato": 7,
    "farmersdelight:rich_soil_sugar_cane_bottom": 15,
    "farmersdelight:rich_soil_sugar_cane_middle": 15,
    "farmersdelight:rich_soil_torchflower_crop": 7,
    "farmersdelight:rich_soil_wheat": 7,
    "farmersdelight:tomato_block": 7,

    //corn delight support
    "corn_delight:corn_crop": 7
};