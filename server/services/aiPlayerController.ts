import { ActionType, GamePhase, type GameState, type Player } from '../types/game';
import { gameManager } from '../utils/gameManager';
import { DeepSeekAIService } from './deepSeekAIService';

const delay = (milliseconds: number) =>
  new Promise<void>(resolve => setTimeout(resolve, milliseconds));

const getAIActor = (game: GameState): Player | null => {
  if (game.pendingActions.length > 0) {
    const pendingAI = game.pendingActions
      .map(pending => game.players.find(player => player.id === pending.playerId))
      .find((player): player is Player => Boolean(player?.isAI));
    return pendingAI ?? null;
  }

  return game.players[game.currentPlayerIndex]?.isAI
    ? game.players[game.currentPlayerIndex]!
    : null;
};

class AIPlayerController {
  private runningGames = new Set<string>();
  private rerunGames = new Set<string>();

  queue(gameId: string): void {
    if (this.runningGames.has(gameId)) {
      this.rerunGames.add(gameId);
      return;
    }

    this.runningGames.add(gameId);
    void this.run(gameId).finally(() => {
      this.runningGames.delete(gameId);
      if (this.rerunGames.delete(gameId)) {
        this.queue(gameId);
      }
    });
  }

  private async run(gameId: string): Promise<void> {
    const delayMs = Math.min(
      Math.max(Number(process.env.AI_ACTION_DELAY_MS) || 900, 200),
      5000
    );

    // A human turn normally arrives within four AI decisions. The guard also
    // prevents a malformed state from spinning forever.
    for (let step = 0; step < 16; step++) {
      let game = await gameManager.getGame(gameId);
      if (!game || game.phase !== GamePhase.PLAYING) return;

      const actor = getAIActor(game);
      if (!actor) return;

      await delay(delayMs);

      game = await gameManager.getGame(gameId);
      if (!game || game.phase !== GamePhase.PLAYING) return;

      const refreshedActor = getAIActor(game);
      if (!refreshedActor || refreshedActor.id !== actor.id) continue;

      const availableActions = await gameManager.getAvailableActions(gameId, actor.id);
      if (availableActions.length === 0) return;

      const decision = await DeepSeekAIService.chooseAction(game, actor, availableActions);

      try {
        await gameManager.executeAction(
          gameId,
          actor.id,
          decision.action,
          decision.tileId,
          decision.tileIds
        );
      } catch (error) {
        console.error(`[AI player] Failed to execute ${decision.action} for ${actor.id}:`, error);

        // A pending reaction must not block the game forever if state changed
        // while the model was answering.
        if (availableActions.includes(ActionType.PASS)) {
          try {
            await gameManager.executeAction(gameId, actor.id, ActionType.PASS);
          } catch (passError) {
            console.error(`[AI player] Failed to pass for ${actor.id}:`, passError);
          }
        }
      }
    }

    console.warn(`[AI player] Decision guard reached for game ${gameId}`);
  }
}

const globalAIController = globalThis as unknown as {
  aiPlayerController?: AIPlayerController;
};

export const aiPlayerController =
  globalAIController.aiPlayerController ?? new AIPlayerController();

globalAIController.aiPlayerController = aiPlayerController;
